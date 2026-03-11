"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
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
exports.default = dev;
