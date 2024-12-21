import React, { useState, useEffect, useContext,useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  GridRegular,
  BookmarkRegular,
  HeartRegular,
  ChatRegular,
} from '@fluentui/react-icons';
import { Link } from 'react-router-dom';
import { ThemeContext } from '../../App';
import { API_URL } from '../../config';
import { getProfileImageUrl } from '../../utils/imageUtils';
import FollowButton from '../Common/FollowButton';
import FollowersModal from './FollowersModal';

const Profile = () => {
  const { username } = useParams();
  const { user: currentUser } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [activeTab, setActiveTab] = useState('posts');
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const { theme } = useContext(ThemeContext);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioText, setBioText] = useState('');
  const [followersModalOpen, setFollowersModalOpen] = useState(false);
  const [followingModalOpen, setFollowingModalOpen] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);

  const fetchProfileData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch profile data
      const profileResponse = await fetch(API_URL + '/api/profile/' + username, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const profileData = await profileResponse.json();
      
      if (!profileResponse.ok) {
        throw new Error(profileData.error || 'Failed to fetch profile');
      }
  
      setProfileData(profileData);
      setBioText(profileData.bio || '');
      setIsFollowing(profileData.isFollowing || false);
  
      // Fetch user's posts using their ID with the correct endpoint
      const postsResponse = await fetch(`${API_URL}/api/posts/user/${profileData._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const postsData = await postsResponse.json();
  
      if (!postsResponse.ok) {
        throw new Error('Failed to fetch posts');
      }
  
      // Ensure posts is always an array
      setPosts(Array.isArray(postsData.posts) ? postsData.posts : []);
    } catch (error) {
      console.error('Error fetching profile data:', error);
      setPosts([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    if (username) {
      fetchProfileData();
    }
  }, [username, fetchProfileData]);

  const handleProfilePhotoClick = () => {
    if (isOwnProfile) {
      // Navigate to profile photo editor or trigger photo upload
      console.log('Edit profile photo');
    }
  };

  const handleBioClick = () => {
    if (isOwnProfile) {
      setIsEditingBio(true);
    }
  };

  const handleBioSubmit = async () => {
    if (!isOwnProfile) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/profile/bio`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bio: bioText }),
      });

      if (response.ok) {
        setProfileData(prev => ({ ...prev, bio: bioText }));
      }
    } catch (error) {
      console.error('Error updating bio:', error);
    }
    setIsEditingBio(false);
  };

  const handleFollowChange = async (newFollowState) => {
    setIsFollowing(newFollowState);
    // Refetch profile data to get updated counts
    await fetchProfileData();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-500">Failed to load profile</div>
      </div>
    );
  }

  const isOwnProfile = currentUser?.username === profileData?.username;

  return (
    <div className="max-w-4xl mx-auto pt-16 px-0">
      <div className="relative w-full aspect-[4/5] overflow-hidden mb-0">
        {/* Profile Photo Section */}
        <div 
          className={`relative w-full h-full ${isOwnProfile ? 'cursor-pointer' : ''}`}
          onClick={handleProfilePhotoClick}
        >
          <img
            src={getProfileImageUrl(profileData?.profilePicture, profileData?.username)}
            alt={profileData?.username}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profileData?.username || 'User')}`;
            }}
          />
        </div>

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent" />
        
        {/* Content Section */}
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <div className="flex justify-between items-start">
            <h1 className="text-2xl font-bold">{profileData?.username}</h1>
            <div className="flex gap-2">
              {!isOwnProfile && (
                <FollowButton
                  userId={profileData._id}
                  initialIsFollowing={isFollowing}
                  onFollowChange={handleFollowChange}
                />
              )}
            </div>
          </div>

          {/* Bio Section */}
          <div 
            className={`mb-4 ${isOwnProfile ? 'cursor-pointer' : ''}`}
            onClick={handleBioClick}
          >
            {isEditingBio ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={bioText}
                  onChange={(e) => setBioText(e.target.value)}
                  className="bg-transparent border-b border-white/30 focus:border-white outline-none text-md text-white/80 w-full"
                  onBlur={handleBioSubmit}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleBioSubmit();
                    }
                  }}
                  autoFocus
                />
              </div>
            ) : (
              <p className="text-md text-white/80">
                {profileData?.bio || (isOwnProfile ? 'Add a bio' : '')}
              </p>
            )}
          </div>

          <div className="flex space-x-6">
            <div>
              <div className="text-lg font-bold">{posts.length}</div>
              <div className="text-sm text-white/80">Posts</div>
            </div>
            <div
              className="cursor-pointer"
              onClick={() => setFollowersModalOpen(true)}
            >
              <div className="text-lg font-bold">{profileData?.followersCount || 0}</div>
              <div className="text-sm text-white/80">Followers</div>
            </div>
            <div
              className="cursor-pointer"
              onClick={() => setFollowingModalOpen(true)}
            >
              <div className="text-lg font-bold">{profileData?.followingCount || 0}</div>
              <div className="text-sm text-white/80">Following</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex justify-center">
        <button
          className={`text-sm flex items-center px-8 py-4 border-t border-transparent ${
            activeTab === 'posts' ? 'border-gray' : ''
          }`}
          onClick={() => setActiveTab('posts')}
        >
          <GridRegular className="w-4 h-4 mr-2" />
          POSTS
        </button>
        {isOwnProfile && (
          <button
            className={`text-sm flex items-center px-8 py-4 border-t border-transparent ${
              activeTab === 'saved' ? 'border-gray' : ''
            }`}
            onClick={() => setActiveTab('saved')}
          >
            <BookmarkRegular className="w-4 h-4 mr-2" />
            SAVED
          </button>
        )}
      </div>

      {/* Posts Grid */}
      {Array.isArray(posts) && posts.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 md:gap-4 p-2">
          {posts.map((post) => (
            <Link 
              key={post._id} 
              to={`/post/${post._id}`}
              className={`relative aspect-square group overflow-hidden rounded-lg ${
                theme === 'dark-theme' ? 'bg-gray-800' : 'bg-white'
              }`}
            >
              {post.mediaType === 'video' ? (
                <div className="w-full h-full bg-black">
                  <video
                    src={post.media.startsWith('http') 
                      ? post.media 
                      : `${API_URL}/uploads/${post.media}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <img
                  src={post.media.startsWith('http') 
                    ? post.media 
                    : `${API_URL}/uploads/${post.media}`}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = '/api/placeholder/400/400';
                  }}
                />
              )}
              
              {/* Hover Overlay */}
              <div className="opacity-0 group-hover:opacity-100 absolute inset-0 bg-black/50 flex items-center justify-center space-x-6 transition-opacity">
                <div className="flex items-center text-white">
                  <HeartRegular className="w-6 h-6 mr-2" />
                  <span className="font-semibold">{post.likes?.length || 0}</span>
                </div>
                <div className="flex items-center text-white">
                  <ChatRegular className="w-6 h-6 mr-2" />
                  <span className="font-semibold">{post.comments?.length || 0}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className={`text-center py-12 ${
          theme === 'dark-theme' ? 'text-gray-400' : 'text-gray-500'
        }`}>
          {isOwnProfile ? "You haven't posted anything yet" : "No posts yet"}
        </div>
      )}

      {/* Followers/Following Modals */}
      <FollowersModal
        isOpen={followersModalOpen}
        onClose={() => setFollowersModalOpen(false)}
        userId={profileData._id}
        type="followers"
        theme={theme}
      />
      <FollowersModal
        isOpen={followingModalOpen}
        onClose={() => setFollowingModalOpen(false)}
        userId={profileData._id}
        type="following"
        theme={theme}
      />
    </div>
  );
};

export default Profile;
