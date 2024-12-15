// backend/src/controllers/userController.js
export const searchUsers = async (req, res) => {
    try {
      const { term } = req.query;
      
      const users = await User.find({
        username: { $regex: term, $options: 'i' },
        _id: { $ne: req.user.userId }
      })
      .select('username profilePicture')
      .limit(10);
  
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: 'Error searching users' });
    }
  };

  const getSuggestedUsers = async (req, res) => {
    try {
      // Get current user's information from auth middleware
      const currentUserId = req.user.userId;
      
      // Find users that the current user is not following
      // Limit to 10 suggestions and exclude current user
      const suggestedUsers = await User.find({
        _id: { $ne: currentUserId },
        // Exclude users that the current user is already following
        followers: { $nin: [currentUserId] }
      })
      .select('username profilePicture')
      .limit(10);
  
      res.json(suggestedUsers);
    } catch (error) {
      console.error('Error getting suggested users:', error);
      res.status(500).json({ error: 'Failed to fetch suggested users' });
    }
  };
  
  // Export the controller
  export { getSuggestedUsers };
  