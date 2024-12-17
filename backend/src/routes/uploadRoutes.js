import express from 'express';
import upload from '../middleware/upload.js';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import s3, { getS3BucketName } from '../config/s3.js';

const router = express.Router();

// Test route for S3 upload with better error handling
router.post('/test', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Log detailed upload information
        console.log('Upload attempt details:', {
            file: req.file,
            body: req.body,
            isS3: !!req.file.location,
            bucket: req.file.bucket || 'N/A',
            key: req.file.key || 'N/A'
        });

        // If using S3, req.file will contain the S3 information
        if (req.file.location) {
            console.log('S3 Upload successful:', {
                location: req.file.location,
                key: req.file.key,
                bucket: req.file.bucket,
                mimetype: req.file.mimetype
            });

            res.json({
                message: 'File uploaded successfully to S3',
                fileDetails: {
                    location: req.file.location,
                    key: req.file.key,
                    bucket: req.file.bucket,
                    mimetype: req.file.mimetype
                }
            });
        } else {
            // Local storage fallback
            console.log('Local upload successful:', {
                path: req.file.path,
                filename: req.file.filename,
                mimetype: req.file.mimetype
            });

            res.json({
                message: 'File uploaded successfully to local storage',
                fileDetails: {
                    path: req.file.path,
                    filename: req.file.filename,
                    mimetype: req.file.mimetype
                }
            });
        }
    } catch (error) {
        console.error('Upload error:', {
            message: error.message,
            stack: error.stack,
            code: error.code
        });
        res.status(500).json({ 
            error: 'Upload failed',
            details: error.message,
            code: error.code
        });
    }
});

// Test route for S3 bucket access
router.get('/test-bucket', async (req, res) => {
    try {
        const bucketName = getS3BucketName();
        console.log('Testing S3 bucket access:', bucketName);
        
        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: 'test.txt' // A simple test file
        });

        try {
            await s3.send(command);
            res.json({ message: 'S3 bucket access successful' });
        } catch (error) {
            if (error.name === 'NoSuchKey') {
                res.json({ message: 'S3 bucket access successful (bucket exists but test file not found)' });
            } else {
                throw error;
            }
        }
    } catch (error) {
        console.error('S3 bucket access error:', {
            message: error.message,
            code: error.code,
            stack: error.stack
        });
        res.status(500).json({ 
            error: 'S3 bucket access failed',
            details: error.message,
            code: error.code
        });
    }
});

// Get uploaded file
router.get('/file/:key', async (req, res) => {
    try {
        const command = new GetObjectCommand({
            Bucket: getS3BucketName(),
            Key: req.params.key
        });

        const { Body, ContentType } = await s3.send(command);
        res.setHeader('Content-Type', ContentType);
        Body.pipe(res);
    } catch (error) {
        console.error('Error retrieving file:', {
            message: error.message,
            code: error.code,
            stack: error.stack
        });
        res.status(500).json({ 
            error: 'Failed to retrieve file',
            details: error.message,
            code: error.code
        });
    }
});

export default router;
