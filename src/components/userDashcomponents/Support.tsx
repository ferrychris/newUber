import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaHeadset, FaSpinner, FaChevronDown, FaChevronUp, 
  FaEnvelope, FaPhone, FaQuestion, FaTicketAlt,
  FaReply, FaComments, FaTimes, FaPaperPlane, FaUser
} from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import supportService, { SupportTicket, SupportMessage, UserInfo } from '../../services/supportService';

interface FAQItem {
  question: string;
  answer: string;
}

const Support: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Local component state
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'new' | 'existing'>('new');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyMessage, setReplyMessage] = useState('');

  // Fetch tickets with React Query
  const { 
    data: tickets = [] as SupportTicket[], 
    isLoading: isLoadingTickets,
    isError: isErrorTickets,
    error: ticketsError 
  } = useQuery<SupportTicket[], Error>({
    queryKey: ['supportTickets'],
    queryFn: supportService.getUserTickets,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true
  });

  // Log errors if they occur
  React.useEffect(() => {
    if (ticketsError) {
      console.error('Error fetching tickets:', ticketsError);
      toast.error(t('common.error'));
    }
  }, [ticketsError, t]);

  // Create ticket mutation
  const createTicketMutation = useMutation({
    mutationFn: ({ subject, message }: { subject: string, message: string }) => 
      supportService.createTicket(subject, message),
    onSuccess: () => {
      // Clear the form
      setSubject('');
      setMessage('');
      
      // Show success message
      toast.success(t('support.ticketSubmitted'));
      
      // Refresh tickets list and switch to existing tickets tab
      queryClient.invalidateQueries({ queryKey: ['supportTickets'] });
      setActiveTab('existing');
    },
    onError: (error) => {
      console.error('Error submitting support ticket:', error);
      toast.error(t('common.error'));
    }
  });

  // Send reply mutation
  const sendReplyMutation = useMutation({
    mutationFn: ({ ticketId, message }: { ticketId: string, message: string }) => 
      supportService.sendReply(ticketId, message),
    onSuccess: (_, variables) => {
      // Clear the reply form
      setReplyMessage('');
      
      // Show success message
      toast.success(t('support.replySent'));
      
      // Refresh ticket messages
      queryClient.invalidateQueries({ queryKey: ['ticketMessages', variables.ticketId] });
      
      // Also invalidate the main tickets list to update message counts
      queryClient.invalidateQueries({ queryKey: ['supportTickets'] });
    },
    onError: (error) => {
      console.error('Error sending reply:', error);
      toast.error(t('common.error'));
    }
  });

  // Get detailed ticket messages when viewing a specific ticket
  const {
    data: selectedTicketMessages = [] as SupportMessage[],
    isLoading: isLoadingMessages
  } = useQuery<SupportMessage[], Error>({
    queryKey: ['ticketMessages', selectedTicket?.id],
    queryFn: () => selectedTicket?.id 
      ? supportService.getTicketMessages(selectedTicket.id)
      : Promise.resolve([]),
    enabled: !!selectedTicket?.id,
    staleTime: 1000 * 60, // 1 minute
    refetchInterval: selectedTicket?.status !== 'closed' ? 10000 : false // Auto-refresh every 10s for open tickets
  });

  // Handle form submissions
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!subject || !message) {
      toast.error(t('support.fillAllFields'));
      return;
    }
    
    createTicketMutation.mutate({ subject, message });
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTicket || !replyMessage.trim()) {
      return;
    }
    
    sendReplyMutation.mutate({ 
      ticketId: selectedTicket.id, 
      message: replyMessage.trim()
    });
  };

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  // Utility functions
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-500';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-500';
      case 'closed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-500';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-500';
    }
  };

  // Sample FAQ items
  const faqItems: FAQItem[] = [
    {
      question: t('support.faq.deliveryTime.question'),
      answer: t('support.faq.deliveryTime.answer')
    },
    {
      question: t('support.faq.cancelOrder.question'),
      answer: t('support.faq.cancelOrder.answer')
    },
    {
      question: t('support.faq.paymentMethods.question'),
      answer: t('support.faq.paymentMethods.answer')
    },
    {
      question: t('support.faq.driverContact.question'),
      answer: t('support.faq.driverContact.answer')
    },
    {
      question: t('support.faq.lostItem.question'),
      answer: t('support.faq.lostItem.answer')
    }
  ];

  return (
    <div className="container mx-auto pb-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center mb-4">
          <FaHeadset className="text-xl mr-2 text-indigo-600 dark:text-indigo-400" />
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            {t('support.title')}
          </h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          {t('support.subtitle')}
        </p>
      </motion.div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Tickets + Form */}
        <div className="lg:col-span-2">
          {/* Ticket Tabs */}
          <div className="bg-white dark:bg-midnight-800 rounded-xl shadow-sm border border-gray-100 dark:border-stone-700/20 mb-6">
            <div className="flex overflow-x-auto">
              <button
                onClick={() => setActiveTab('new')}
                className={`flex items-center px-4 py-3 font-medium whitespace-nowrap border-b-2 transition-colors duration-300 ${
                  activeTab === 'new'
                    ? 'border-indigo-600 dark:border-indigo-500 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <FaTicketAlt className="mr-2" />
                {t('support.newTicket')}
              </button>
              
              <button
                onClick={() => { 
                  setActiveTab('existing');
                  setSelectedTicket(null);
                }}
                className={`flex items-center px-4 py-3 font-medium whitespace-nowrap border-b-2 transition-colors duration-300 ${
                  activeTab === 'existing'
                    ? 'border-indigo-600 dark:border-indigo-500 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <FaComments className="mr-2" />
                {t('support.myTickets')}
                {tickets && tickets.length > 0 && (
                  <span className="ml-2 bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 text-xs rounded-full px-2 py-0.5">
                    {tickets.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* New Ticket Form */}
          {activeTab === 'new' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-midnight-800 rounded-xl shadow-sm border border-gray-100 dark:border-stone-700/20 p-6"
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                {t('support.contactUs')}
              </h2>
              
              <form onSubmit={handleSubmit}>              
                <div className="mb-4">
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('support.subject')}
                  </label>
                  <input
                    type="text"
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-stone-600/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-purple-500 dark:bg-midnight-700"
                    placeholder={t('support.subjectPlaceholder')}
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('support.message')}
                  </label>
                  <textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={5}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-stone-600/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-purple-500 dark:bg-midnight-700"
                    placeholder={t('support.messagePlaceholder')}
                  ></textarea>
                </div>
                
                <button
                  type="submit"
                  disabled={createTicketMutation.isPending}
                  className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-medium rounded-lg transition-colors duration-300 flex items-center justify-center"
                >
                  {createTicketMutation.isPending ? (
                    <>
                      <FaSpinner className="animate-spin mr-2" />
                      {t('support.submitting')}
                    </>
                  ) : (
                    t('support.submit')
                  )}
                </button>
              </form>
            </motion.div>
          )}

          {/* Existing Tickets */}
          {activeTab === 'existing' && (
            <AnimatePresence mode="wait">
              {selectedTicket ? (
                <motion.div
                  key="ticket-detail"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white dark:bg-midnight-800 rounded-xl shadow-sm border border-gray-100 dark:border-stone-700/20 p-6"
                >
                  {/* Ticket Header */}
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <div className="flex items-center mb-2">
                        <FaTicketAlt className="text-indigo-600 dark:text-indigo-400 mr-2" />
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                          {selectedTicket.subject}
                        </h2>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 items-center text-sm text-gray-600 dark:text-gray-400">
                        <span>{t('support.created')}: {formatDate(selectedTicket.created_at)}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedTicket.status)}`}>
                          {selectedTicket.status}
                        </span>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => setSelectedTicket(null)}
                      className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white rounded-full"
                    >
                      <FaTimes />
                    </button>
                  </div>
                  
                  {/* Messages */}
                  <div className="space-y-4 mb-6 max-h-96 overflow-y-auto p-2">
                    {isLoadingMessages ? (
                      <div className="flex justify-center p-4">
                        <FaSpinner className="animate-spin text-indigo-600 dark:text-indigo-400" />
                      </div>
                    ) : (
                      <>
                        {/* Show initial ticket message if available */}
                        {selectedTicket.messages && selectedTicket.messages.length > 0 && 
                          selectedTicket.messages.map((msg) => (
                            <div 
                              key={msg.id} 
                              className="flex items-start"
                            >
                              <div className="h-8 w-8 rounded-full overflow-hidden mr-3 bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                                {msg.sender_image ? (
                                  <img src={msg.sender_image} alt={msg.sender_name} className="h-full w-full object-cover" />
                                ) : (
                                  <FaUser className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center mb-1">
                                  <span className="font-medium text-gray-900 dark:text-white mr-2">
                                    {msg.sender_name}
                                    {msg.is_admin && (
                                      <span className="text-xs font-normal ml-1 text-indigo-600 dark:text-indigo-400">
                                        ({t('support.supportTeam')})
                                      </span>
                                    )}
                                  </span>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {formatDate(msg.created_at)}
                                  </span>
                                </div>
                                <div className="bg-gray-100 dark:bg-midnight-700 rounded-lg p-3 text-gray-800 dark:text-gray-200">
                                  {msg.message}
                                </div>
                              </div>
                            </div>
                          ))
                        }
                        
                        {/* Show additional messages from the detailed query if any */}
                        {selectedTicketMessages.length > 0 &&
                          selectedTicketMessages
                            .filter(msg => !selectedTicket.messages?.some(initialMsg => initialMsg.id === msg.id))
                            .map((msg) => (
                              <div 
                                key={msg.id} 
                                className="flex items-start"
                              >
                                <div className="h-8 w-8 rounded-full overflow-hidden mr-3 bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                                  {msg.sender_image ? (
                                    <img src={msg.sender_image} alt={msg.sender_name} className="h-full w-full object-cover" />
                                  ) : (
                                    <FaUser className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center mb-1">
                                    <span className="font-medium text-gray-900 dark:text-white mr-2">
                                      {msg.sender_name}
                                      {msg.is_admin && (
                                        <span className="text-xs font-normal ml-1 text-indigo-600 dark:text-indigo-400">
                                          ({t('support.supportTeam')})
                                        </span>
                                      )}
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      {formatDate(msg.created_at)}
                                    </span>
                                  </div>
                                  <div className="bg-gray-100 dark:bg-midnight-700 rounded-lg p-3 text-gray-800 dark:text-gray-200">
                                    {msg.message}
                                  </div>
                                </div>
                              </div>
                            ))
                        }
                      </>
                    )}
                  </div>
                  
                  {/* Reply Form */}
                  {selectedTicket.status !== 'closed' && (
                    <form onSubmit={handleSendReply} className="mt-4">
                      <div className="flex items-center space-x-2">
                        <textarea
                          value={replyMessage}
                          onChange={(e) => setReplyMessage(e.target.value)}
                          placeholder={t('support.typeReply')}
                          rows={2}
                          className="flex-1 p-2 rounded-lg border border-gray-300 dark:border-stone-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-purple-500 dark:bg-midnight-700 dark:text-white"
                        />
                        <button
                          type="submit"
                          disabled={!replyMessage.trim() || sendReplyMutation.isPending}
                          className="bg-indigo-600 text-white p-3 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {sendReplyMutation.isPending ? (
                            <FaSpinner className="animate-spin h-5 w-5" />
                          ) : (
                            <FaPaperPlane className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="ticket-list"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white dark:bg-midnight-800 rounded-xl shadow-sm border border-gray-100 dark:border-stone-700/20 overflow-hidden"
                >
                  {isLoadingTickets ? (
                    <div className="p-8 flex justify-center">
                      <FaSpinner className="animate-spin text-indigo-600 dark:text-indigo-400 text-2xl" />
                    </div>
                  ) : isErrorTickets ? (
                    <div className="p-8 text-center">
                      <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FaTimes className="text-red-600 dark:text-red-400 text-2xl" />
                      </div>
                      <h3 className="font-medium text-gray-900 dark:text-white text-lg mb-2">
                        {t('common.error')}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        {String(ticketsError)}
                      </p>
                      <button
                        onClick={() => queryClient.invalidateQueries({ queryKey: ['supportTickets'] })}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-medium rounded-lg transition-colors duration-300"
                      >
                        {t('common.tryAgain')}
                      </button>
                    </div>
                  ) : tickets && tickets.length === 0 ? (
                    <div className="p-8 text-center">
                      <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FaTicketAlt className="text-indigo-600 dark:text-indigo-400 text-2xl" />
                      </div>
                      <h3 className="font-medium text-gray-900 dark:text-white text-lg mb-2">
                        {t('support.noTickets')}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        {t('support.noTicketsDesc')}
                      </p>
                      <button
                        onClick={() => setActiveTab('new')}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-medium rounded-lg transition-colors duration-300"
                      >
                        {t('support.createTicket')}
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100 dark:divide-stone-700/20">
                      {tickets && tickets.map((ticket: SupportTicket) => (
                        <div
                          key={ticket.id}
                          className="p-4 hover:bg-gray-50 dark:hover:bg-midnight-700/30 cursor-pointer transition-colors duration-300"
                          onClick={() => setSelectedTicket(ticket)}
                        >
                          <div className="flex justify-between mb-2">
                            <h3 className="font-medium text-gray-900 dark:text-white">{ticket.subject}</h3>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                              {ticket.status}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600 dark:text-gray-400">{formatDate(ticket.created_at)}</span>
                            <span className="text-indigo-600 dark:text-indigo-400 flex items-center">
                              <FaComments className="mr-1" />
                              {ticket.messages?.length || 0}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
        
        {/* FAQ and Contact Info */}
        <div className="lg:col-span-1">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-midnight-800 rounded-xl shadow-sm border border-gray-100 dark:border-stone-700/20 p-6 mb-6"
          >
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {t('support.faq.title')}
            </h2>
            
            <div className="space-y-3">
              {faqItems.map((item, index) => (
                <div key={index} className="border-b border-gray-100 dark:border-stone-700/20 pb-3 last:border-0">
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full flex justify-between items-center text-left font-medium text-gray-900 dark:text-white py-2 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors duration-300"
                  >
                    <span>{item.question}</span>
                    {expandedFaq === index ? (
                      <FaChevronUp className="text-indigo-600 dark:text-indigo-400" />
                    ) : (
                      <FaChevronDown className="text-gray-500 dark:text-gray-400" />
                    )}
                  </button>
                  
                  {expandedFaq === index && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      transition={{ duration: 0.3 }}
                      className="text-gray-600 dark:text-gray-400 text-sm pb-2"
                    >
                      {item.answer}
                    </motion.div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-midnight-800 rounded-xl shadow-sm border border-gray-100 dark:border-stone-700/20 p-6"
          >
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {t('support.contactInfo')}
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="bg-indigo-100 dark:bg-indigo-900/20 p-3 rounded-lg text-indigo-600 dark:text-indigo-400 mr-3">
                  <FaEnvelope />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">{t('support.email')}</h3>
                  <p className="text-gray-600 dark:text-gray-400">support@drivergo.com</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="bg-indigo-100 dark:bg-indigo-900/20 p-3 rounded-lg text-indigo-600 dark:text-indigo-400 mr-3">
                  <FaPhone />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">{t('support.phone')}</h3>
                  <p className="text-gray-600 dark:text-gray-400">+33 1 23 45 67 89</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="bg-indigo-100 dark:bg-indigo-900/20 p-3 rounded-lg text-indigo-600 dark:text-indigo-400 mr-3">
                  <FaQuestion />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">{t('support.hours')}</h3>
                  <p className="text-gray-600 dark:text-gray-400">{t('support.availability')}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Support; 