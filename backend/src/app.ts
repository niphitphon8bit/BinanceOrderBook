import router from './routes/index.route';
import express, { Application } from 'express';

const app: Application = express();

app.use(express.json());
app.use('/', router);

export default app;