export const sql = require('mssql');
import { getUserList,
         userRegister, } from "./common"

export let connected = false;

const config = {
    user: 'user_web',
    password: 'Cm!202012',
    server: '20.196.217.179',
    port: 10099,
    trustServerCertificate: true,
    stream: true
};

sql.connect(config, async function(err){
    if(err){
        return console.error('error : ', err);
    }
    console.log('MSSQL 연결 완료 초기설정 시작');
    connected = true;

    try {
        await userRegister(null);
        await getUserList(null);
    } catch(e) {
        console.log(e);
    }

    console.log('초기설정 완료');
});