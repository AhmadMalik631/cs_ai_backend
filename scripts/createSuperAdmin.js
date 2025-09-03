require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/userModel');
const bcrypt = require('bcryptjs');

const createSuperAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        // Check if super admin already exists
        const existingAdmin = await User.findOne({ role: 'super_admin' });
        if (existingAdmin) {
            console.log('Super admin already exists');
            process.exit(0);
        }

        await User.create({
            name: 'Super Admin',
            email: 'admin@company.com',
            password: 'admin123',
            role: 'super_admin',
            isActive: true
        });

        console.log('Super admin created successfully');
        console.log('Email: admin@company.com');
        console.log('Password: admin123');
        console.log('Please change these credentials after first login');
        process.exit(0);
    } catch (error) {
        console.error('Error creating super admin:', error);
        process.exit(1);
    }
};

createSuperAdmin();
