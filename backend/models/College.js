import mongoose from 'mongoose';
import { normalizeCollegeName } from '../src/utils/normalizeCollegeName.js';

// Using existing schema structure - DO NOT modify
const collegeSchema = new mongoose.Schema({
  aisheCode: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  state: {
    type: String,
    required: true
  },
  district: {
    type: String,
    required: true
  },
  searchText: {
    type: String,
    required: true
  },
  normalizedSearchText: {
    type: String,
    default: ''
  }
}, {
  timestamps: false
});

collegeSchema.pre('save', function (next) {
  if (this.name) {
    this.normalizedSearchText = normalizeCollegeName(this.name);
  }
  next();
});

// Indexes already exist in database - DO NOT recreate
// text index on searchText
// compound index on state + district

const College = mongoose.models.College || mongoose.model('College', collegeSchema);

export default College;















