import { promisify } from 'util';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import axios from 'axios';
import { insertLog, } from "../common"
  
export const ValidationToken = async (token: string, path: string): Promise<boolean> => {
    if(!token) {
      await insertLog('', 'token is null '+ path)
      return false;
    }
    const [header, payload] = token.split('.');
  
    const headerObj = JSON.parse(Buffer.from(header, 'base64').toString());
    const payloadObj = JSON.parse(Buffer.from(payload, 'base64').toString());
  
    const jwksUri = 'https://login.microsoftonline.com/6d5ac8ee-3862-4452-93e7-a836c2d9742b/discovery/v2.0/keys';
    const kid = headerObj.kid;
    const audience = payloadObj.aud;
  
    const client = jwksClient({
      jwksUri,
      cache: true,
      cacheMaxAge: 60 * 60,
    });
  
    let publicKey = null;
    try {
      const getSigningKey = promisify(client.getSigningKey);
      publicKey  = await getSigningKey(kid);
    } catch (e) {
      await insertLog('', 'invalid token error' + e);
      return false;
    }
    return await verifyToken(token, publicKey.getPublicKey(), audience, path);
}

const verifyToken = async (token: string, publicKey: string, audience: string, path: string): Promise<boolean> => {
    let ret = false;
    try {
      const decoded = jwt.decode(token, {complete: true});
      const payload = (<any>decoded).payload;
      const preferred_username = payload.preferred_username;
    
      await jwt.verify(token, publicKey, { audience }, async (err) => {
        if (err) {
          await insertLog(preferred_username, 'Invalid token '+ path + ' token : ' + JSON.stringify(payload));
          ret = false;
        } else {
          await insertLog(preferred_username, 'Valid token '+ path + ' token : ' + JSON.stringify(payload));
          ret = true
        }
      });
    } catch(e) {
      await insertLog('verifyToken', "Error : " + JSON.stringify(e) + ", " + e.message);
    }
  
    return ret;
}

export const ValidationTokenGateway = async (token: string): Promise<boolean> => {
  try {
    const res = await axios.get(`https://gw.ahnlabcloudmate.com/token/introspect`,{
      headers: {
        authorization: 'Bearer ' + token,
      },
    });

    await insertLog('ValidationTokenGateway', JSON.stringify(res.data));

    return res.data.Active;
  } catch (e) {
    await insertLog('ValidationTokenGateway', "Error : " + JSON.stringify(e) + ", " + e.message);
  }

  return false;
}