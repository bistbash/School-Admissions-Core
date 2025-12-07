import axios from 'axios'; // We might need to install node-fetch if global fetch isn't available, but let's try global first or use a simple http request.
// Actually, let's use standard http to avoid dependencies if possible, or just assume fetch is there.
// If node version is old, fetch might not be there.
// Let's use a simple async function with fetch.

const BASE_URL = 'http://localhost:3000/api';

async function verify() {
    try {
        console.log('Starting verification...');

        // 1. Create Department
        console.log('Creating Department...');
        const deptRes = await axios.post(`${BASE_URL}/departments`, { name: 'Cyber Defense' });
        const dept = deptRes.data;
        console.log('Department created:', dept);

        // 2. Create Role
        console.log('Creating Role...');
        const roleRes = await axios.post(`${BASE_URL}/roles`, { name: 'Developer' });
        const role = roleRes.data;
        console.log('Role created:', role);

        // 3. Create Soldier
        console.log('Creating Soldier...');
        const soldierRes = await axios.post(`${BASE_URL}/soldiers`, {
            personalNumber: `1234567${Math.floor(Math.random() * 1000)}`,
            name: 'John Doe',
            type: 'CONSCRIPT',
            departmentId: dept.id,
            roleId: role.id,
        });
        const soldier = soldierRes.data;
        console.log('Soldier created:', soldier);

        // 4. Create Room
        console.log('Creating Room...');
        const roomRes = await axios.post(`${BASE_URL}/rooms`, { name: 'War Room', capacity: 10 });
        const room = roomRes.data;
        console.log('Room created:', room);

        console.log('Verification completed successfully!');
    } catch (error) {
        console.error('Verification failed:', error);
        process.exit(1);
    }
}

verify();
