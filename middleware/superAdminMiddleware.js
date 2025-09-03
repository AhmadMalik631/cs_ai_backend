const isSuperAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'super_admin') {
        next();
    } else {
        res.status(403);
        throw new Error("Access denied. Super admin only.");
    }
};

module.exports = isSuperAdmin;
