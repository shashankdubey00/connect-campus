import mongoose from 'mongoose';

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
  }
}, {
  timestamps: false
});

// Indexes already exist in database - DO NOT recreate
// text index on searchText
// compound index on state + district

const College = mongoose.models.College || mongoose.model('College', collegeSchema);

export default College;










