const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  color: {
    type: String,
    default: '#667eea'
  },
  icon: {
    type: String,
    default: '🏢'
  },
  ownerId: {
    type: String,
    required: true
  },
  members: [{
    userId: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'member'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    invitedBy: {
      type: String
    }
  }],
  settings: {
    allowMemberInvites: {
      type: Boolean,
      default: true
    },
    defaultProjectVisibility: {
      type: String,
      enum: ['private', 'organization', 'public'],
      default: 'organization'
    },
    timezone: {
      type: String,
      default: 'UTC'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes
organizationSchema.index({ ownerId: 1 });
organizationSchema.index({ 'members.userId': 1 });
organizationSchema.index({ name: 1 });
organizationSchema.index({ isActive: 1, isArchived: 1 });

// Virtual for member count
organizationSchema.virtual('memberCount').get(function() {
  return this.members.length;
});

// Virtual for project count
organizationSchema.virtual('projectCount', {
  ref: 'Project',
  localField: '_id',
  foreignField: 'organizationId',
  count: true
});

// Pre-save middleware
organizationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Ensure the owner is in the members array
organizationSchema.pre('save', function(next) {
  if (this.isNew) {
    // Add owner to members if not already present
    const ownerExists = this.members.some(member => 
      member.userId === this.ownerId && member.role === 'owner'
    );
    
    if (!ownerExists) {
      this.members.unshift({
        userId: this.ownerId,
        role: 'owner',
        joinedAt: new Date()
      });
    }
  }
  next();
});

// Methods
organizationSchema.methods.addMember = function(userId, role = 'member', invitedBy = null) {
  const existingMember = this.members.find(member => member.userId === userId);
  
  if (existingMember) {
    throw new Error('User is already a member of this organization');
  }
  
  this.members.push({
    userId,
    role,
    joinedAt: new Date(),
    invitedBy
  });
  
  return this.save();
};

organizationSchema.methods.removeMember = function(userId) {
  if (userId === this.ownerId) {
    throw new Error('Cannot remove the organization owner');
  }
  
  this.members = this.members.filter(member => member.userId !== userId);
  return this.save();
};

organizationSchema.methods.updateMemberRole = function(userId, newRole) {
  if (userId === this.ownerId) {
    throw new Error('Cannot change the organization owner role');
  }
  
  const member = this.members.find(member => member.userId === userId);
  if (!member) {
    throw new Error('User is not a member of this organization');
  }
  
  member.role = newRole;
  return this.save();
};

organizationSchema.methods.isMember = function(userId) {
  return this.members.some(member => member.userId === userId);
};

organizationSchema.methods.isAdmin = function(userId) {
  const member = this.members.find(member => member.userId === userId);
  return member && (member.role === 'owner' || member.role === 'admin');
};

organizationSchema.methods.canInviteMembers = function(userId) {
  if (userId === this.ownerId) return true;
  
  const member = this.members.find(member => member.userId === userId);
  return member && (member.role === 'admin' || (member.role === 'member' && this.settings.allowMemberInvites));
};

module.exports = mongoose.models.Organization || mongoose.model('Organization', organizationSchema);