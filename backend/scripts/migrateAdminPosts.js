import mongoose from 'mongoose';
import Post from '../src/models/Post.js';
import fs from 'fs/promises';
import path from 'path';

const NEW_ADMIN_ID = '6768876726f5d5210f235654';
const POST_IDS = [
    '67624963089fae35eed0a7aa',
    '67625186a6b6ca75ad3cb9f3',
    '676251cfa6b6ca75ad3cb9fc',
    '6762525aa6b6ca75ad3cba0c',
    '676252b4a6b6ca75ad3cba15'
];

async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
}

async function createBackup(posts) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join('/tmp', `posts-backup-${timestamp}.json`);

    try {
        // Save backup to /tmp directory (which is writable on Render)
        await fs.writeFile(
            backupPath,
            JSON.stringify(posts, null, 2)
        );
        console.log('Backup created successfully');
        console.log('Backup contains the following post IDs:');
        posts.forEach(post => {
            console.log(`- ${post._id} (current user: ${post.user})`);
        });
    } catch (error) {
        console.error('Backup creation failed:', error);
        throw error;
    }
}

async function migratePosts() {
    try {
        // 1. Find all specified posts
        const posts = await Post.find({
            _id: { $in: POST_IDS }
        });

        if (posts.length === 0) {
            console.log('No posts found with the specified IDs');
            return;
        }

        console.log(`\nFound ${posts.length} posts to migrate:`);
        posts.forEach(post => {
            console.log(`- Post ${post._id}`);
            console.log(`  Current user: ${post.user}`);
            console.log(`  Created at: ${post.createdAt}`);
        });

        // 2. Create backup
        await createBackup(posts);

        // 3. Update posts
        const updateResult = await Post.updateMany(
            { _id: { $in: POST_IDS } },
            { $set: { user: NEW_ADMIN_ID } }
        );

        console.log(`\nMigration Results:`);
        console.log(`- Found: ${posts.length} posts`);
        console.log(`- Updated: ${updateResult.modifiedCount} posts`);
        console.log(`- Target admin ID: ${NEW_ADMIN_ID}`);

        // 4. Verify changes
        const verifyPosts = await Post.find({
            _id: { $in: POST_IDS }
        });

        const allUpdated = verifyPosts.every(post => 
            post.user.toString() === NEW_ADMIN_ID
        );

        if (allUpdated) {
            console.log('All posts successfully migrated to new admin');
        } else {
            console.error('Some posts were not properly updated');
            const notUpdated = verifyPosts
                .filter(post => post.user.toString() !== NEW_ADMIN_ID)
                .map(post => post._id);
            console.error('Posts not updated:', notUpdated);
        }

    } catch (error) {
        console.error('Migration failed:', error);
        throw error;
    }
}

async function main() {
    try {
        console.log('Starting migration process...');
        await connectDB();
        await migratePosts();
        console.log('\nMigration completed successfully');
    } catch (error) {
        console.error('\nMigration script failed:');
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
    } finally {
        try {
            await mongoose.disconnect();
            console.log('Disconnected from MongoDB');
        } catch (error) {
            console.error('Error disconnecting from MongoDB:', error);
        }
    }
}

// Execute the migration
main();
