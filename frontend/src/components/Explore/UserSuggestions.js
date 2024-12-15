import React, { useState, useEffect, useContext, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from '@carbon/icons-react';
import { DismissRegular } from '@fluentui/react-icons';
import { ThemeContext } from '../../App';
import { API_URL } from '../../config';

const UserSuggestions = () => {
  const { theme } = useContext(ThemeContext);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const containerRef = useRef(null);
  
  
  const fetchSuggestedUsers = async () => {
    try {
      console.log('Fetching suggested users...');
      const response = await fetch(API_URL + '/api/users/suggestions', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      console.log('Suggested users data:', data);
      
      // Ensure data is properly formatted
      const formattedUsers = Array.isArray(data) ? data : data.users || [];
      console.log('Formatted users:', formattedUsers);
      
      setUsers(formattedUsers);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching suggested users:', error);
      setUsers([]);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestedUsers();
  }, []);

  // Check scroll position
  const checkScrollPosition = () => {
    if (containerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth);
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollPosition);
      // Initial check
      checkScrollPosition();
    }
    return () => {
      if (container) {
        container.removeEventListener('scroll', checkScrollPosition);
      }
    };
  }, []);

  const handleScroll = (direction) => {
    if (containerRef.current) {
      const scrollAmount = 400;
      containerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

 const handleFollow = async (userId) => {
   try {
     const response = await fetch(`API_URL + /api/users/${userId}/follow`, {
       method: 'POST',
       headers: {
         'Authorization': `Bearer ${localStorage.getItem('token')}`
       }
     });

     if (!response.ok) throw new Error('Failed to follow user');
     
     setUsers(users.map(u => {
       if (u._id === userId) {
         return { ...u, isFollowing: true };
       }
       return u;
     }));
   } catch (error) {
     console.error('Error following user:', error);
   }
 };

 if (loading) {
  return (
    <div className="flex justify-center p-4">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
    </div>
  );
}

 if (!users.length) {
   return (
     <div className={`rounded-lg shadow-lg mb-6 p-6 ${
      theme === 'dark-theme' ? 'bg-gray-900' : 'bg-gray-50'
     }`}>
       <h2 className="text-lg font-semibold">Build your community</h2>
       <p className="text-gray-500 mt-2">There's nobody to see at the moment</p>
     </div>
   );
 }

 if (!isVisible) return null;

 if (loading) {
   return (
     <div className="flex justify-center p-4">
       <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
     </div>
   );
 }

 if (!users.length) {
   return null;
 }

 return (
   <div className={`rounded-lg shadow-lg mb-6 ${
    theme === 'dark-theme' ? 'bg-gray-900' : 'bg-gray-50'
   }`}>
     <div className={`p-6 border-b ${
       theme === 'dark-theme' ? 'border-gray-800' : 'border-gray-200'
     }`}>
       <div className="flex justify-between items-center">
         <h2 className={`text-xl font-semibold ${
           theme === 'dark-theme' ? 'text-white' : 'text-gray-900'
         }`}>
           Find New People To Follow
         </h2>
         <button
           onClick={() => setIsVisible(false)}
           className={`p-2 rounded-full hover:bg-gray-100 ${
             theme === 'dark-theme' 
               ? 'text-white hover:bg-gray-800' 
               : 'text-gray-600 hover:bg-gray-100'
           }`}
           aria-label="Close"
         >
           <DismissRegular className="w-5 h-5" />
         </button>
       </div>
     </div>
     
     <div className="relative">
       {canScrollLeft && (
         <button
           onClick={() => handleScroll('left')}
           className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full ${
             theme === 'dark-theme' 
               ? 'bg-gray-800 text-white hover:bg-gray-700' 
               : 'bg-white text-gray-800 hover:bg-gray-100'
           }`}
         >
           <ArrowLeft size={24} />
         </button>
       )}

       <div 
         ref={containerRef}
         className="flex overflow-x-auto scroll-smooth hide-scrollbar p-6 space-x-6"
         style={{ scrollbarWidth: 'none' }}
       >
         {users.map(suggestedUser => (
           <div 
             key={suggestedUser._id}
             className="relative min-w-[300px] h-[400px] rounded-lg overflow-hidden"
           >
             <Link to={`/profile/${suggestedUser._id}`} className="block w-full h-full">
               <div className="absolute inset-0">
                 {suggestedUser.profilePicture ? (
                   <img 
                     src={`API_URL + /uploads/${suggestedUser.profilePicture}`}
                     alt={suggestedUser.username}
                     className="w-full h-full object-cover"
                     onError={(e) => {
                       e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(suggestedUser.username)}`;
                     }}
                   />
                 ) : (
                   <div className={`w-full h-full ${
                     theme === 'dark-theme' ? 'bg-gray-800' : 'bg-gray-200'
                   }`} />
                 )}
               </div>

               <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
             </Link>

             <div className="absolute bottom-0 left-0 right-0 p-6">
               <span className="text-white text-xl font-medium block mb-3">
                 {suggestedUser.username}
               </span>
               <button
                 onClick={(e) => {
                   e.preventDefault();
                   handleFollow(suggestedUser._id);
                 }}
                 className={`w-full px-4 py-2 rounded-lg font-medium ${
                   suggestedUser.isFollowing
                     ? theme === 'dark-theme'
                       ? 'bg-gray-800 text-white hover:bg-gray-700'
                       : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                     : 'bg-blue-500 text-white hover:bg-blue-600'
                 }`}
               >
                 {suggestedUser.isFollowing ? 'Following' : 'Follow'}
               </button>
             </div>
           </div>
         ))}
       </div>

       {canScrollRight && (
         <button
           onClick={() => handleScroll('right')}
           className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full ${
             theme === 'dark-theme' 
               ? 'bg-gray-800 text-white hover:bg-gray-700' 
               : 'bg-white text-gray-800 hover:bg-gray-100'
           }`}
         >
           <ArrowRight size={24} />
         </button>
       )}
     </div>
   </div>
 );
};

export default UserSuggestions;