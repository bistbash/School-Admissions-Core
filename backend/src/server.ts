import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import soldiersRoutes from './modules/soldiers/soldiers.routes';
import departmentsRoutes from './modules/departments/departments.routes';
import rolesRoutes from './modules/roles/roles.routes';
import roomsRoutes from './modules/rooms/rooms.routes';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/soldiers', soldiersRoutes);
app.use('/api/departments', departmentsRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/rooms', roomsRoutes);

app.get('/', (req, res) => {
    res.send('Military Resource Management API is running');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

export { prisma };
