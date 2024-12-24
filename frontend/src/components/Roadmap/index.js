
import React, { useState, useContext } from 'react';
import { 
  ChevronDownRegular,
  ChevronUpRegular,
  ChatRegular,
  EditRegular,
  CalendarRegular,
  Video16Regular,
} from '@fluentui/react-icons';
import { ThemeContext } from '../../context/ThemeContext';


  const RoadmapEntry = ({ title, date, description, details }) => {
    const { theme } = useContext(ThemeContext);
    const [isOpen, setIsOpen] = useState(false);
  
    return (
      <div className={`rounded-lg shadow-sm mb-4 overflow-hidden transition-all duration-300 ${
        theme === 'dark-theme' ? 'bg-gray-900' : 'bg-white'
      }`}>
        <div 
          className={`p-4 cursor-pointer flex items-center justify-between ${
            theme === 'dark-theme' 
              ? 'hover:bg-gray-800' 
              : 'hover:bg-gray-50'
          }`}
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="flex items-top space-x-3">
            <div className={theme === 'dark-theme' ? 'text-gray-400' : 'text-gray-500'}>
            {title === 'Secure Chat' ? <ChatRegular className="w-5 h-5" /> :
   title === 'Text Posting' ? <EditRegular className="w-5 h-5" /> :
   <Video16Regular className="w-5 h-5" />}
            </div>
            <div>
              <h3 className={`font-medium text-lg ${
                theme === 'dark-theme' ? 'text-white' : 'text-gray-900'
              }`}>{title}</h3>
              <div className={`flex items-center text-sm ${
                theme === 'dark-theme' ? 'text-gray-400' : 'text-gray-500'
              }`}>
                <CalendarRegular className="w-4 h-4 mr-1" />
                <span>{date}</span>
              </div>
            </div>
          </div>
          {isOpen ? (
            <ChevronUpRegular className={`w-5 h-5 ${
              theme === 'dark-theme' ? 'text-gray-400' : 'text-gray-500'
            }`} />
          ) : (
            <ChevronDownRegular className={`w-5 h-5 ${
              theme === 'dark-theme' ? 'text-gray-400' : 'text-gray-500'
            }`} />
          )}
        </div>
        
        {isOpen && (
          <div className={`p-4 border-t ${
            theme === 'dark-theme' 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-gray-50 border-gray-200'
          }`}>
            <p className={
              theme === 'dark-theme' ? 'text-gray-300 mb-4' : 'text-gray-600 mb-4'
            }>{description}</p>
            <div className="space-y-3">
              {details.map((detail, index) => (
                <div key={index} className="flex items-start">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 mr-3"></div>
                  <p className={
                    theme === 'dark-theme' ? 'text-gray-300' : 'text-gray-700'
                  }>{detail}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };
  
  const Roadmap = () => {
    const { theme } = useContext(ThemeContext);
    const features = [
      {
        title: 'Text Posting',
        date: 'February 2025',
        description: 'A text-driven posting feature enabling users to share real-time updates, long-form thoughts, and more..',
        details: [
          'Character-limited posts with rich-text editing/formatting',
          'Hashtag and mention support for content discovery',
          'Simple media embedding (images, GIFs)',
          'Threaded replies for streamlined conversations',
          'Post engagement indicators (likes, reposts, comments)',
          'User-friendly moderation and reporting tools'
        ]
      },
    {
      title: 'Secure Chat',
      date: 'February 2025',
      description: 'End-to-end encrypted messaging system for secure communication between users.',
      details: [
        'End-to-end encryption for all messages',
        'Real-time message delivery',
        'Read receipts and typing indicators',
        'Media sharing capabilities',
        'Message deletion and editing',
        'Group chat support'
      ]
    },
    {
      title: 'Video',
      date: 'March 2025',
      description: 'Share short/long-form videos',
      details: [
        'Support for multiple aspect ratios: 9x16 and 16x9',
        'Interactive stickers and filters',
        'View count and engagement metrics',
        'Comment, reply, and interact with videos',
        'Save them for later or share with a friend'
      ]
    }
  ];


  return (
    <div className={`w-full ${
      theme === 'dark-theme' ? 'bg-black' : 'bg-gray-50'
    }`}>
      <div className="max-w-3xl mx-auto px-4 pt-20">
        <div className="mb-8">
          <h1 className={`text-xl font-bold mb-2 ${
            theme === 'dark-theme' ? 'text-white' : 'text-gray-900'
          }`}>Feature Roadmap</h1>
          <p className={
            theme === 'dark-theme' ? 'text-gray-400' : 'text-gray-600'
          }>
            Upcoming features and improvements planned for Vestige
          </p>
        </div>

        <div className="space-y-6">
          {features.map((feature, index) => (
            <RoadmapEntry
              key={index}
              title={feature.title}
              date={feature.date}
              description={feature.description}
              details={feature.details}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Roadmap;
