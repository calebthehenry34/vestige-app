import React, { useState, useEffect,useContext } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  GridRegular,
  BookmarkRegular,
  HeartRegular,
  ChatRegular,
  LauncherSettingsRegular
} from '@fluentui/react-icons';
import { Link } from 'react-router-dom';
import { ThemeContext } from '../../App';
import { API_URL } from '../../config';

const Profile = () => {
  const { username } = useParams();
  const { user: currentUser } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [activeTab, setActiveTab] = useState('posts');
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const { theme } = useContext(ThemeContext);


  // Fetch profile data and posts
  useEffect(() => {
    const fetchProfileData = async () => {
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

        // Fetch user's posts using their ID
        const postsResponse = await fetch(API_URL + '/api/posts?userId=' + profileData._id, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const postsData = await postsResponse.json();

        if (!postsResponse.ok) {
          throw new Error('Failed to fetch posts');
        }

        setPosts(postsData);
      } catch (error) {
        console.error('Error fetching profile data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (username) {
      fetchProfileData();
    }
  }, [username]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const isOwnProfile = currentUser?.username === profileData?.username;


  return (
    <div className="max-w-4xl mx-auto pt-16 px-0">
      <div className="relative w-full aspect-[4/5] overflow-hidden mb-0">
      <img
  src={profileData?.profilePicture 
    ? `${API_URL}/uploads/${profileData.profilePicture}`
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(profileData?.username || 'User')}`
  }
  alt={profileData?.username}
  className="absolute inset-0 w-full h-full object-cover"
  onError={(e) => {
    console.log('Profile picture load error, using fallback');
    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profileData?.username || 'User')}`;
    e.target.onError = null;
  }}
/>
  {/* Gradient Overlay */}
  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent" />
  {/* Content */}
  <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
  <div className="flex justify-between items-start">
    <h1 className="text-2xl font-bold">{profileData?.username}</h1>
    <div className="flex gap-2">
      {isOwnProfile ? (
        <Link
          to="/settings"
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          <LauncherSettingsRegular className="w-6 h-6" />
        </Link>
      ) : (
        <button className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 flex items-center">
          Follow
        </button>
      )}
    </div>
  </div>
  {profileData?.bio && (
    <p className="text-md text-white/80 mb-4">{profileData.bio}</p>
  )}
    <div className="flex space-x-6">
      <div>
        <div className="text-lg font-bold">{profileData?.posts?.length || 0}</div>
        <div className="text-sm text-white/80">Posts</div>
      </div>
      <div>
        <div className="text-lg font-bold">{profileData?.followers?.length || 0}</div>
        <div className="text-sm text-white/80">Followers</div>
      </div>
      <div>
        <div className="text-lg font-bold">{profileData?.following?.length || 0}</div>
        <div className="text-sm text-white/80">Following</div>
      </div>
    </div>
  </div>
</div>


      {/* Tabs and Posts remain the same */}
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
                  console.log('Image load error:', post.media);
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

      {/* No Posts Message */}
      {posts.length === 0 && (
        <div className={`text-center py-12 ${
          theme === 'dark-theme' ? 'text-gray-400' : 'text-gray-500'
        }`}>
          {isOwnProfile ? "You haven't posted anything yet" : "No posts yet"}
        </div>
      )}
    </div>
  );
};

export default Profile;