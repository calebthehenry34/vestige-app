import User from '../models/User.js';
import Post from '../models/Post.js';
import Follow from '../models/Follow.js';
import Notification from '../models/notification.js';
import mongoose from 'mongoose';
import { deleteS3Object } from '../config/s3.js';

export const deleteUser = async (userId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Find the user first
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // 1. Delete user's posts and their media
    const userPosts = await Post.find({ user: userId });
    for (const post of userPosts) {
      if (post.mediaKey) {
        await deleteS3Object(post.mediaKey);
      }
    }
    await Post.deleteMany({ user: userId }, { session });

    // 2. Remove user's comments and replies from other posts
    await Post.updateMany(
      { 'comments.user': userId },
      { $pull: { comments: { user: userId } } },
      { session }
    );
    await Post.updateMany(
      { 'comments.replies.user': userId },
      { $pull: { 'comments.$[].replies': { user: userId } } },
      { session }
    );

    // 3. Remove user's likes from posts and comments
    await Post.updateMany(
      { likes: userId },
      { $pull: { likes: userId } },
      { session }
    );
    await Post.updateMany(
      { 'comments.likes': userId },
      { $pull: { 'comments.$[].likes': userId } },
      { session }
    );

    // 4. Delete follow relationships
    await Follow.deleteMany({
      $or: [
        { follower: userId },
        { following: userId }
      ]
    }, { session });

    // 5. Delete messages
    await Message.deleteMany({
      $or: [
        { sender: userId },
        { recipient: userId }
      ]
    }, { session });

    // 6. Delete notifications
    await Notification.deleteMany({
      $or: [
        { sender: userId },
        { recipient: userId }
      ]
    }, { session });

    // 7. Remove user references from other users' saved posts
    await User.updateMany(
      { savedPosts: { $in: userPosts.map(post => post._id) } },
      { $pull: { savedPosts: { $in: userPosts.map(post => post._id) } } },
      { session }
    );

    // 8. Remove profile picture from S3 if it exists
    if (user.profilePicture && user.profilePicture.includes('amazonaws.com')) {
      const key = user.profilePicture.split('/').pop();
      await deleteS3Object(key);
    }

    // 9. Finally delete the user using remove() to trigger pre-remove middleware
    await user.remove({ session });

    await session.commitTransaction();
    return { success: true, message: 'User and all associated data deleted successfully' };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};
