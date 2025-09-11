import mongoose from 'mongoose';

const adminUserSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  addedBy: { type: String, required: true },
  addedAt: { type: Date, default: Date.now },
});

const AdminUser = mongoose.models.AdminUser || mongoose.model('AdminUser', adminUserSchema);

export default AdminUser;

