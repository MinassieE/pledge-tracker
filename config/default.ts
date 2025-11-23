import dotenv from 'dotenv';

dotenv.config();

const dev = {
  app: {
    host: 'localhost',
    port: process.env.SERVER_PORT || 8001,
  },
  db: {
    username: process.env.MONGO_USERNAME,
    password: process.env.MONGO_PASSWORD,
    host: process.env.MONGO_DB_HOST || 'localhost',
    dbName: process.env.DB_NAME,
    dbUrl: process.env.DB_URL || 'mongodb://localhost/NCIC_PLEDGE',
  },
};

export default dev;