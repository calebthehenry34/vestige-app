import express from 'express';
import { trackEmailOpen } from '../services/emailService.js';

const router = express.Router();

router.get('/track/:trackingId', async (req, res) => {
  try {
    await trackEmailOpen(req.params.trackingId, req);
    
    // Return a 1x1 transparent pixel
    res.set('Content-Type', 'image/gif');
    res.send(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
  } catch (error) {
    console.error('Error tracking email:', error);
    res.status(500).end();
  }
});

export default router;