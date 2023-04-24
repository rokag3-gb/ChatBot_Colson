const sql = require('mssql');

const config = {
    user: 'user_web',
    password: 'Cm!202012',
    server: '20.249.88.177',
    port: 10099,
    trustServerCertificate: true,
    stream: true
};

export const getRequest = async () => {
    return (await sql.connect(config)).request();
}