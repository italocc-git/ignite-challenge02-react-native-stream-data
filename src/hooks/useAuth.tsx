import { makeRedirectUri, revokeAsync, startAsync } from 'expo-auth-session';
import React, { useEffect, createContext, useContext, useState, ReactNode } from 'react';
import { generateRandom } from 'expo-auth-session/build/PKCE';

import { api } from '../services/api';

interface User {
  id: number;
  display_name: string;
  email: string;
  profile_image_url: string;
}

interface AuthContextData {
  user: User;
  isLoggingOut: boolean;
  isLoggingIn: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

interface AuthProviderData {
  children: ReactNode;
}

interface AuthorizationResponse  {
  params : {
    state : string;
    error : string;
    access_token : string;
  }
  type : string;
}

const AuthContext = createContext({} as AuthContextData);

const twitchEndpoints = {
  authorization: 'https://id.twitch.tv/oauth2/authorize',
  revocation: 'https://id.twitch.tv/oauth2/revoke'
};

function AuthProvider({ children }: AuthProviderData) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [user, setUser] = useState({} as User);
  const [userToken, setUserToken] = useState('');
  const {CLIENT_ID} = process.env
 

  async function signIn() {
    try {
      setIsLoggingIn(true)

      const REDIRECT_URI = makeRedirectUri({useProxy : true }) //https://auth.expo.io/@italocc/streamData
      const RESPONSE_TYPE = 'token'
      const SCOPE = encodeURI('openid user:read:email user:read:follows')
      const FORCE_VERIFY = true
      const STATE = generateRandom(30)
      
      /* const authUrl = `${twitchEndpoints.authorization}?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}
      &response_type=${RESPONSE_TYPE}&scope=${SCOPE}&force_verify=${FORCE_VERIFY}&state=${STATE}` */


      const authUrl = twitchEndpoints.authorization + 
      `?client_id=${CLIENT_ID}` + 
      `&redirect_uri=${REDIRECT_URI}` + 
      `&response_type=${RESPONSE_TYPE}` + 
      `&scope=${SCOPE}` + 
      `&force_verify=${FORCE_VERIFY}` +
      `&state=${STATE}`;

      const {type , params} = await startAsync({authUrl }) as AuthorizationResponse
      
      if (type === 'success' && params.error !== 'access_denied'){

        if(params.state !== STATE) {
          throw new Error('Invalid state value')
          
        }
        //adding toke access in header authorization

        api.defaults.headers.authorization = `Bearer ${params.access_token}`

        const userDataResponse = await api.get('/users');

        console.log(userDataResponse.data.data[0])
        setUser({
          id : userDataResponse.data.data[0].id,
          display_name : userDataResponse.data.data[0].display_name,
          email : userDataResponse.data.data[0].email,
          profile_image_url : userDataResponse.data.data[0].profile_image_url
        })
        setUserToken(params.access_token)
        
      }
      

        // add access_token to request's authorization header

        // call Twitch API's users route

        // set user state with response from Twitch API's route "/users"
        // set userToken state with response's access_token from startAsync
    } catch (error ) {
        throw new Error()
    } finally {
      
      setIsLoggingIn(false);

    }
  }

  async function signOut() {
    try {
      setIsLoggingOut(true)
      
      await revokeAsync({token : userToken , clientId : CLIENT_ID  } , { revocationEndpoint : twitchEndpoints.revocation})
     
    } catch (error) {
    } finally {
      setUser({} as User)
      setUserToken('')

      delete api.defaults.headers.authorization;
     
      setIsLoggingOut(false)
    }
  }

  useEffect(() => {
    // add client_id to request's "Client-Id" header

    api.defaults.headers['Client-Id'] = CLIENT_ID
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoggingOut, isLoggingIn, signIn, signOut }}>
      { children }
    </AuthContext.Provider>
  )
}

function useAuth() {
  const context = useContext(AuthContext);

  return context;
}

export { AuthProvider, useAuth };
