router.post('/', auth, async (req, res) => {
    try {
      const { recipientId, type, postId } = req.body;
      const notification = await Notification.create({
        recipient: recipientId,
        sender: req.user.userId,
        type,
        post: postId,
        read: false
      });
      
      res.status(201).json(notification);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create notification' });
    }
  });