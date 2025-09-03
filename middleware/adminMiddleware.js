const User = require('../models/userModel');

const adminOnly = async (req, res, next) => {
    const user = await User.findById(req.user._id);
    
    if (user.role !== 'super_admin') {
        res.status(403);
        throw new Error('Access denied. Super admin only.');
    }
    next();
};

module.exports = adminOnly;
