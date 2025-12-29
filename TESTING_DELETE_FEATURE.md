# Testing Delete Message Feature Locally

## How to Test "Delete for Me" vs "Delete for All"

### Prerequisites
1. Make sure your backend server is running on `http://localhost:5000`
2. Make sure your frontend is running on `http://localhost:5173`
3. Have at least 2 browser windows/tabs open (or use incognito mode for second user)

### Test Scenario 1: Delete for Me

**Steps:**
1. **User A** sends a message in a college chat
2. **User B** should see the message
3. **User A** long-presses their own message → Selects "Delete for me"
4. **Expected Result:**
   - ✅ **User A** should NOT see the message anymore
   - ✅ **User B** should STILL see the message
   - ✅ Message still exists in database (check MongoDB)

**How to Verify:**
- Open MongoDB Compass or use MongoDB shell
- Check the `messages` collection - the message should still be there
- Check the `deletedmessages` collection - there should be a record with `userId: User A's ID` and `messageId: the message ID`

### Test Scenario 2: Delete for All

**Steps:**
1. **User A** sends a message in a college chat
2. **User B** should see the message
3. **User A** long-presses their own message → Selects "Delete for all"
4. **Expected Result:**
   - ✅ **User A** should NOT see the message anymore
   - ✅ **User B** should NOT see the message anymore
   - ✅ Message should be deleted from database

**How to Verify:**
- Open MongoDB Compass or use MongoDB shell
- Check the `messages` collection - the message should be GONE
- Check the `deletedmessages` collection - any records for this message should also be deleted

### Test Scenario 3: Multiple Users Delete for Me

**Steps:**
1. **User A** sends a message
2. **User B** and **User C** both see the message
3. **User B** deletes the message "for me"
4. **User C** deletes the message "for me"
5. **Expected Result:**
   - ✅ **User A** should STILL see the message (they sent it)
   - ✅ **User B** should NOT see the message
   - ✅ **User C** should NOT see the message
   - ✅ Message still exists in database

**How to Verify:**
- Check `deletedmessages` collection - should have 2 records:
  - One with `userId: User B's ID`
  - One with `userId: User C's ID`
  - Both with same `messageId`

### Quick MongoDB Queries for Verification

```javascript
// Check if message exists
db.messages.findOne({ _id: ObjectId("YOUR_MESSAGE_ID") })

// Check deleted records for a message
db.deletedmessages.find({ messageId: ObjectId("YOUR_MESSAGE_ID") })

// Check all deleted messages for a user
db.deletedmessages.find({ userId: ObjectId("YOUR_USER_ID") })

// Count deleted messages for a user
db.deletedmessages.countDocuments({ userId: ObjectId("YOUR_USER_ID") })
```

### Testing Checklist

- [ ] Delete for me - message disappears only for the user who deleted it
- [ ] Delete for me - message still visible to other users
- [ ] Delete for me - message still exists in database
- [ ] Delete for all - message disappears for all users
- [ ] Delete for all - message deleted from database
- [ ] Delete for all - all "delete for me" records also removed
- [ ] Long-press works on mobile (touch)
- [ ] Long-press works on desktop (mouse)
- [ ] Menu appears near the message
- [ ] Copy functionality works
- [ ] Confirmation modal appears before deletion

### Common Issues to Check

1. **Message not disappearing after "Delete for me":**
   - Check browser console for errors
   - Verify API call is successful (check Network tab)
   - Check if `DeletedMessage` model is created correctly
   - Verify the GET messages endpoint filters correctly

2. **Message still visible to other users after "Delete for all":**
   - Check if message is actually deleted from database
   - Verify socket events are working (if implemented)
   - Check if other users need to refresh to see changes

3. **Menu not appearing:**
   - Check if long-press timer is working (500ms)
   - Verify touch/mouse events are properly bound
   - Check browser console for JavaScript errors

### Using Browser DevTools

1. **Open DevTools** (F12)
2. **Network Tab**: Monitor API calls when deleting
   - Should see `DELETE /api/messages/message/:messageId` for "Delete for me"
   - Should see `DELETE /api/messages/message/:messageId/for-all` for "Delete for all"
3. **Console Tab**: Check for any errors
4. **Application Tab → Local Storage**: Check if any state is stored locally

### Testing with Multiple Browser Windows

1. Open your app in **Chrome** (User A)
2. Open your app in **Firefox** or **Incognito Chrome** (User B)
3. Both users should be logged in with different accounts
4. Join the same college chat
5. Test delete functionality as described above

This way you can see real-time behavior across multiple users!

