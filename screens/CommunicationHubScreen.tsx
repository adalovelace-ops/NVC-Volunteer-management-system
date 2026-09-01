import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';

import {

  Alert,

  KeyboardAvoidingView,

  Modal,

  Platform,

  ScrollView,

  StyleSheet,

  Text,

  TextInput,

  TouchableOpacity,

  View,

  useWindowDimensions,

  Image,

  ActivityIndicator,

  Linking,

  Animated,

} from 'react-native';

import { MaterialIcons, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

import { Picker } from '@react-native-picker/picker';

import { useFocusEffect } from '@react-navigation/native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../contexts/AuthContext';

import {

  composePhilippineAddress,

  getCitiesByRegion,

  PHCityMunicipality,

  PHRegions,

} from '../utils/philippineAddressData';

import ProposalMessageTemplate from '../components/ProposalMessageTemplate';

import {

  deleteProjectGroupChat,

  deleteMessage,

  deleteProjectGroupMessage,

  getAllPartnerProjectApplications,

  getAllUsers,

  getConversation,

  getMessagesForUser,

  getProject,

  getProjectGroupMessages,

  getProjectsScreenSnapshot,

  leaveVolunteerEventGroup,
  joinProjectEvent,

  markMessageAsRead,

  saveMessage,

  saveEvent,

  saveProjectGroupMessage,

  saveProject,

  subscribeToMessages,

  subscribeToStorageChanges,

  submitPartnerProgramProposal,
  reviewPartnerProjectApplication,
  getProgramModuleFromProposalProjectId,
  setTypingStatus,
  subscribeToTypingStatus,
} from '../models/storage';

import {

  Message,

  PartnerProjectApplication,

  PartnerProjectProposalDetails,

  Project,

  ProjectGroupMessage,

  User,

  AdvocacyFocus,

} from '../models/types';

import { navigateToAvailableRoute } from '../utils/navigation';

import { isImageMediaUri, pickDocumentFromDevice, pickImageFromDevice } from '../utils/media';

import { getRequestErrorMessage } from '../utils/requestErrors';

import ProposalCard from '../components/ProposalCard';
import AppLogo from '../components/AppLogo';

const QUICK_EMOJIS = ['😊','😂','❤️','👍','👏','🙏','😍','🔥','💪','🎉','😁','🤔','😮','😢','🙌','✅','⭐','🌟','💚','💙','😅','🥰','🤩','👌','💯','🙂'];



function LazyDateTimePicker(props: any) {

  if (Platform.OS === 'web') {

    return (

      <View style={{ marginTop: 10 }}>

        <input

          type="date"

          value={props.value instanceof Date ? props.value.toISOString().split('T')[0] : ''}

          onChange={(e) => {

            if (props.onChange) {

              props.onChange({ type: 'set' }, new Date(e.target.value));

            }

          }}

          style={{

            width: '100%',

            padding: '12px',

            borderRadius: '10px',

            border: '1px solid #e2e8f0',

            fontSize: '14px',

            fontFamily: 'inherit',

            color: '#1e293b',

            backgroundColor: '#fff',

            cursor: 'pointer'

          }}

        />

      </View>

    );

  }

  const DateTimePickerComponent = require('@react-native-community/datetimepicker').default;

  return <DateTimePickerComponent {...props} />;

}



type SidebarSection = 'messages' | 'projects' | 'proposals' | 'contacts';



type ConversationItem = {

  user: User;

  lastMessage?: Message;

  unreadCount: number;

};



type ProjectChatMember = {

  id: string;

  name: string;

  role: 'Admin' | 'Partner' | 'Volunteer';

  detail?: string;

};



type ProjectChatItem = {

  project: Project;

  participantCount: number;

  members: ProjectChatMember[];
};

function ThreeDotsTypingIndicator() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createAnimation = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: -5,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.delay(400),
        ])
      );
    };

    const a1 = createAnimation(dot1, 0);
    const a2 = createAnimation(dot2, 150);
    const a3 = createAnimation(dot3, 300);

    a1.start();
    a2.start();
    a3.start();

    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [dot1, dot2, dot3]);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 4, height: 16 }}>
      <Animated.View
        style={{
          width: 7,
          height: 7,
          borderRadius: 3.5,
          backgroundColor: '#166534',
          transform: [{ translateY: dot1 }],
        }}
      />
      <Animated.View
        style={{
          width: 7,
          height: 7,
          borderRadius: 3.5,
          backgroundColor: '#166534',
          transform: [{ translateY: dot2 }],
        }}
      />
      <Animated.View
        style={{
          width: 7,
          height: 7,
          borderRadius: 3.5,
          backgroundColor: '#166534',
          transform: [{ translateY: dot3 }],
        }}
      />
    </View>
  );
}

const PROPOSAL_PREFIX = '___PROPOSAL_CARD___:';



type ProposalChatItem = {

  application: PartnerProjectApplication;

  projectTitle: string;

  programModule: string;

};



type ChatMessage = Message | ProjectGroupMessage;

function getProposalReviewCardKey(message: ChatMessage): string | null {
  if (typeof message.content !== 'string' || !message.content.startsWith(PROPOSAL_PREFIX)) {
    return null;
  }

  try {
    const data = JSON.parse(message.content.replace(PROPOSAL_PREFIX, ''));
    const status = String(data.status || '').trim();
    const applicationId = String(data.applicationId || data.application?.id || '').trim();
    const reviewedAt = String(data.reviewedAt || '').trim();
    const reviewedBy = String(data.reviewedBy || '').trim();
    if (!applicationId || !reviewedAt || !reviewedBy || !['Approved', 'Rejected'].includes(status)) {
      return null;
    }

    return [applicationId, status, reviewedAt, reviewedBy, message.senderId].join(':');
  } catch (_) {
    return null;
  }
}

function dedupeProposalReviewCards(messagesToDedupe: ChatMessage[]): ChatMessage[] {
  const seenReviewCards = new Set<string>();
  return messagesToDedupe.filter(message => {
    const reviewCardKey = getProposalReviewCardKey(message);
    if (!reviewCardKey) {
      return true;
    }

    if (seenReviewCards.has(reviewCardKey)) {
      return false;
    }

    seenReviewCards.add(reviewCardKey);
    return true;
  });
}



function upsertChatMessage(current: ChatMessage[], incoming: ChatMessage): ChatMessage[] {

  const byId = new Map(current.map(message => [message.id, message]));

  byId.set(incoming.id, incoming);

  const result = dedupeProposalReviewCards(Array.from(byId.values()));

  return result.sort(

    (left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime()

  );

}



function getAttachmentName(uri: string, index: number): string {
  const safeUri = String(uri || '').trim();
  if (safeUri.startsWith('data:')) {
    const mimeType = safeUri.slice(5, safeUri.indexOf(';') > -1 ? safeUri.indexOf(';') : undefined);
    const extension = mimeType.includes('/') ? mimeType.split('/').pop() : 'file';
    return `Attachment ${index + 1}.${extension || 'file'}`;
  }

  const cleanUri = safeUri.split('?')[0];
  const fileName = cleanUri.split('/').pop();
  return fileName || `Attachment ${index + 1}`;
}



function formatProposalDate(value?: string): string {

  const normalizedValue = String(value || '').trim();

  if (!normalizedValue) {

    return 'Not provided';

  }



  const parsedDate = new Date(normalizedValue);

  if (Number.isNaN(parsedDate.getTime())) {

    return normalizedValue;

  }



  return parsedDate.toLocaleDateString(undefined, {

    year: 'numeric',

    month: 'long',

    day: 'numeric',

  });

}



type ProposalFormState = {

  proposedTitle: string;

  proposedDescription: string;

  proposedStartDate: string;

  proposedEndDate: string;

  proposedLocation: string;

  proposedVolunteersNeeded: string;

  communityNeed: string;

  expectedDeliverables: string;

  photoAttachment?: string;

};

const createEmptyProposalForm = (title = ''): ProposalFormState => ({
  proposedTitle: title,
  proposedDescription: '',
  proposedStartDate: '',
  proposedEndDate: '',
  proposedLocation: '',
  proposedVolunteersNeeded: '',
  communityNeed: '',
  expectedDeliverables: '',
  photoAttachment: '',
});



function getSidebarSectionMeta(section: SidebarSection): {

  label: string;

  icon: keyof typeof MaterialIcons.glyphMap;

} {

  switch (section) {

    case 'projects':

      return { label: 'Event GC', icon: 'groups' };

    case 'proposals':

      return { label: 'Proposals', icon: 'calendar-today' };

    case 'contacts':

      return { label: 'Contacts', icon: 'contacts' };

    case 'messages':

    default:

      return { label: 'Messages', icon: 'mail-outline' };

  }

}





export default function CommunicationHubScreen({ navigation, route }: any) {

  const { user, isAdmin } = useAuth();

  const insets = useSafeAreaInsets();

  const { width } = useWindowDimensions();

  const isWide = width >= 1024;

  const isTablet = width >= 768;

  const isVolunteer = user?.role === 'volunteer';
  const isDetailsAdmin = isAdmin;

  const isPartner = user?.role === 'partner';



  const {

    projectId: requestedProjectId,

    conversationUserId,

    newProposalModule,

    newProposalProjectId,

    newProposalTitle,
    
    proposalId: requestedProposalId,
    
    section: requestedSection

  } = route?.params || {};



  const [view, setView] = useState<'sidebar' | 'detail'>(isWide ? 'detail' : 'sidebar');

  const [activeSection, setActiveSection] = useState<SidebarSection>(

    user?.role === 'admin' ? 'messages' : 'messages'

  );

  const [loading, setLoading] = useState(true);



  const [conversations, setConversations] = useState<ConversationItem[]>([]);

  const [projectChats, setProjectChats] = useState<ProjectChatItem[]>([]);

  const [proposalChats, setProposalChats] = useState<ProposalChatItem[]>([]);

  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [systemPrograms, setSystemPrograms] = useState<{ id: string; title: string; module: AdvocacyFocus }[]>([]);



  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [selectedProjectChat, setSelectedProjectChat] = useState<ProjectChatItem | null>(null);

  const [selectedProposalApplication, setSelectedProposalApplication] = useState<PartnerProjectApplication | null>(null);

  const [proposalIntent, setProposalIntent] = useState<{ module?: string; projectId?: string; title?: string } | null>(null);

  const [proposalRevisionMode, setProposalRevisionMode] = useState(false);



  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  const loadMessagesInFlightRef = useRef(false);

  const [messageText, setMessageText] = useState('');

  const [pendingAttachments, setPendingAttachments] = useState<string[]>([]);

  const [searchText, setSearchText] = useState('');

  const [isSending, setIsSending] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [reviewNotice, setReviewNotice] = useState<{

    title: string;

    message: string;

    tone: 'success' | 'warning';

    projectId?: string;

  } | null>(null);



  const [activeProposalCardData, setActiveProposalCardData] = useState<any>(null);

  const [rejectionNotes, setRejectionNotes] = useState('');

  const [showRejectionModal, setShowRejectionModal] = useState(false);

  const [pendingRejectApp, setPendingRejectApp] = useState<PartnerProjectApplication | null>(null);

  const [isRecipientTyping, setIsRecipientTyping] = useState(false);
  const typingTimeoutRef = useRef<any>(null);


  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const [showConversationMenu, setShowConversationMenu] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [availableVolunteers, setAvailableVolunteers] = useState<any[]>([]);

  const [showMembersModal, setShowMembersModal] = useState(false);

  const [conversationMenuAction, setConversationMenuAction] = useState<string | null>(null);

  // Inline draft proposal card state (shown inside the message thread, not a separate screen)
  const [inlineDraftProposal, setInlineDraftProposal] = useState<ProposalFormState | null>(null);
  const [inlineDraftModule, setInlineDraftModule] = useState<string>('Nutrition');
  const [inlineDraftProjectId, setInlineDraftProjectId] = useState<string>('new');
  const [inlineStartDatePicker, setInlineStartDatePicker] = useState(false);
  const [inlineEndDatePicker, setInlineEndDatePicker] = useState(false);
  const [inlineRegionCode, setInlineRegionCode] = useState('');
  const [inlineCityCode, setInlineCityCode] = useState('');
  const [inlineFilteredCities, setInlineFilteredCities] = useState<PHCityMunicipality[]>([]);
  const [inlineDraftDocAttachment, setInlineDraftDocAttachment] = useState<string>('');
  const [isSubmittingInlineDraft, setIsSubmittingInlineDraft] = useState(false);



  const scrollRef = useRef<ScrollView>(null);

  const selectedUserRef = useRef<User | null>(null);

  const selectedProjectChatRef = useRef<ProjectChatItem | null>(null);

  const loadDataInFlightRef = useRef<Promise<void> | null>(null);



  const [proposalForm, setProposalForm] = useState<ProposalFormState>(() =>
    createEmptyProposalForm(newProposalTitle || '')
  );



  const [showStartDatePicker, setShowStartDatePicker] = useState(false);

  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  const [selectedRegionCode, setSelectedRegionCode] = useState('');

  const [selectedCityCode, setSelectedCityCode] = useState('');

  const [filteredCities, setFilteredCities] = useState<PHCityMunicipality[]>([]);

  const [locRegion, setLocRegion] = useState('');

  const [locCity, setLocCity] = useState('');



  useEffect(() => {
    if (!isWide && navigation) {
      const showHeader = view === 'sidebar';
      navigation.setOptions({ headerShown: showHeader });
    } else if (isWide && navigation) {
      navigation.setOptions({ headerShown: true });
    }
  }, [view, isWide, navigation]);

  const availableSections: SidebarSection[] = isVolunteer
    ? ['messages', 'projects', 'contacts']
    : isPartner
    ? ['messages', 'projects', 'proposals', 'contacts']
    : ['messages', 'projects', 'contacts'];



  const loadData = useCallback(async () => {

    if (!user) return;

    if (loadDataInFlightRef.current) {
      return loadDataInFlightRef.current;
    }

    const run = (async () => {

    const t0 = Date.now();
    try {

      // Start all fetches in parallel, snapshot limited to fields needed for messages
      const t_users = Date.now();
      const t_snapshot = Date.now();
      const t_messages = Date.now();
      const t_apps = Date.now();

      const usersP = getAllUsers().then(r => { console.log(`[COM-HUB] getAllUsers ${Date.now() - t_users}ms`); return r; });
      const snapshotP = getProjectsScreenSnapshot(user, ['projects', 'partnerApplications', 'volunteerProfile', 'volunteerJoinRecords']).then(r => { console.log(`[COM-HUB] getProjectsScreenSnapshot ${Date.now() - t_snapshot}ms`); return r; });
      const messagesP = getMessagesForUser(user.id).then(r => { console.log(`[COM-HUB] getMessagesForUser ${Date.now() - t_messages}ms`); return r; });
      const partnerAppsP = (user.role === 'volunteer' ? Promise.resolve([] as PartnerProjectApplication[]) : getAllPartnerProjectApplications()).then(r => { console.log(`[COM-HUB] getAllPartnerProjectApplications ${Date.now() - t_apps}ms`); return r; });

      // FAST PATH: render DM conversations without waiting for heavy snapshot
      const [usersResult, messagesResult, partnerApplicationsResult] = await Promise.allSettled([usersP, messagesP, partnerAppsP]);
      console.log(`[COM-HUB] fast path (users+messages) done in ${Date.now() - t_users}ms`);

      const users = usersResult.status === 'fulfilled' ? usersResult.value : [];
      const msgs = messagesResult.status === 'fulfilled' ? messagesResult.value : [];
      const directPartnerApplications = partnerApplicationsResult.status === 'fulfilled' ? partnerApplicationsResult.value : [];

      const others = users.filter(u => u.id !== user.id);
      let adminUsers = users.filter(candidate => candidate.role === 'admin' || (candidate as any).isAdmin);
      if (adminUsers.length === 0) {
        adminUsers = [{
          id: 'admin-1',
          name: 'NVC Admin',
          email: 'admin@nvc.org',
          role: 'admin',
          status: 'Active',
          createdAt: new Date().toISOString(),
        } as User];
      }

      const allowedDirectUsers = user.role === 'volunteer' || user.role === 'partner'
        ? (others.filter(u => u.role === 'admin' || (u as any).isAdmin).length > 0
            ? others.filter(u => u.role === 'admin' || (u as any).isAdmin)
            : adminUsers)
        : others;
      const allowedDirectUserIds = new Set(allowedDirectUsers.map(u => u.id));
      setAllUsers(allowedDirectUsers);
      // Immediate DM conversation list for sidebar
      {
        const fastConvMap = new Map<string, ConversationItem>();
        allowedDirectUsers.forEach(u => {
          fastConvMap.set(u.id, { user: u, unreadCount: 0 });
        });
        msgs.forEach(m => {
          const otherId = m.senderId === user.id ? m.recipientId : m.senderId;
          if (!allowedDirectUserIds.has(otherId)) return;
          const otherUser = allowedDirectUsers.find(u => u.id === otherId);
          if (!otherUser) return;
          const entry = fastConvMap.get(otherId) || { user: otherUser, unreadCount: 0 };
          if (!entry.lastMessage || new Date(m.timestamp) > new Date(entry.lastMessage.timestamp)) {
            entry.lastMessage = m;
          }
          if (!m.read && m.recipientId === user.id) {
            entry.unreadCount++;
          }
          fastConvMap.set(otherId, entry as ConversationItem);
        });
        const convList = Array.from(fastConvMap.values()).sort((a, b) =>
          new Date(b.lastMessage?.timestamp || 0).getTime() - new Date(a.lastMessage?.timestamp || 0).getTime()
        );
        setConversations(convList);

        // Preselect admin conversation if on wide screen and none selected
        if (isWide && (user.role === 'volunteer' || user.role === 'partner') && allowedDirectUsers.length > 0) {
          if (!selectedUserRef.current && !selectedProjectChatRef.current) {
            setSelectedUser(allowedDirectUsers[0]);
            setView('detail');
          }
        }

        // Show messages immediately — don't wait for heavy project snapshot
        setLoading(false);
      }

      // Now await the heavy snapshot (already in flight) for project/proposal chats
      let snapshotResult: PromiseSettledResult<any>;
      try {
        const v = await snapshotP;
        snapshotResult = { status: 'fulfilled', value: v } as any;
      } catch (e) {
        snapshotResult = { status: 'rejected', reason: e } as any;
      }
      const snapshot =
        (snapshotResult as any).status === 'fulfilled'
          ? (snapshotResult as any).value
          : {
              projects: [],
              partnerApplications: [],
              volunteerJoinRecords: [],
              volunteerProfile: null,
            };



      // Extract active programs present in system
      const loadedProjects: Project[] = Array.isArray(snapshot.projects) ? snapshot.projects : [];
      const loadedPrograms = loadedProjects
        .filter(p => !p.isEvent && !p.parentProjectId)
        .map(p => {
          let mod: AdvocacyFocus = 'Nutrition';
          const text = `${p.programModule || ''} ${p.id || ''} ${p.title || ''} ${p.category || ''}`.toLowerCase();
          if (text.includes('education')) mod = 'Education';
          else if (text.includes('livelihood')) mod = 'Livelihood';
          else if (text.includes('disaster')) mod = 'Disaster';
          else if (text.includes('nutrition')) mod = 'Nutrition';
          return { id: p.id, title: p.title, module: mod };
        });
      setSystemPrograms(loadedPrograms);

      const joinedEventIds = new Set(snapshot.volunteerJoinRecords.map(record => record.projectId));

      const volunteerProfileId = snapshot.volunteerProfile?.id;



      const approvedPartnerProjectIds = new Set(

        [...snapshot.partnerApplications, ...directPartnerApplications]

          .filter(

            application =>

              application.status === 'Approved' && application.partnerUserId === user.id

          )

          .map(application => application.projectId)

          .filter(Boolean)

      );



      setProjectChats(

        snapshot.projects

          .filter(project => {

            if (!project?.isEvent || project.groupChatDisabled) {

              return false;

            }

            if (user.role === 'admin') {

              return true;

            }

            if (user.role === 'partner') {

              return (

                approvedPartnerProjectIds.has(project.id) ||

                Boolean(project.parentProjectId && approvedPartnerProjectIds.has(project.parentProjectId))

              );

            }



            const joinedByRecord = joinedEventIds.has(project.id);

            const joinedByUserId = (project.joinedUserIds || []).includes(user.id);

            const joinedByVolunteerId = Boolean(

              volunteerProfileId && (project.volunteers || []).includes(volunteerProfileId)

            );

            return joinedByRecord || joinedByUserId || joinedByVolunteerId;

          })

          .map(project => {

            const memberMap = new Map<string, ProjectChatMember>();

            adminUsers.forEach(admin => {

              memberMap.set(`admin:${admin.id}`, {

                id: admin.id,

                name: admin.name || 'Admin',

                role: 'Admin',

                detail: admin.email,

              });

            });



            (project.joinedUserIds || []).forEach(joinedUserId => {

              const joinedUser = users.find(candidate => candidate.id === joinedUserId);

              if (!joinedUser || joinedUser.role !== 'volunteer') {

                return;

              }



              memberMap.set(`volunteer:${joinedUser.id}`, {

                id: joinedUser.id,

                name: joinedUser.name || 'Volunteer',

                role: 'Volunteer',

                detail: joinedUser.email,

              });

            });



            [...snapshot.partnerApplications, ...directPartnerApplications]

              .filter(application => {

                if (application.status !== 'Approved') {

                  return false;

                }



                return (

                  application.projectId === project.id ||

                  Boolean(project.parentProjectId && application.projectId === project.parentProjectId)

                );

              })

              .forEach(application => {

                const partnerUser = users.find(candidate => candidate.id === application.partnerUserId);

                memberMap.set(`partner:${application.partnerUserId}`, {

                  id: application.partnerUserId,

                  name: application.partnerName || partnerUser?.name || 'Partner Account',

                  role: 'Partner',

                  detail: application.partnerEmail || partnerUser?.email,

                });

              });



            const members = Array.from(memberMap.values()).sort((left, right) => {

              const rank = { Admin: 0, Partner: 1, Volunteer: 2 };

              const roleRank = rank[left.role] - rank[right.role];

              return roleRank !== 0 ? roleRank : left.name.localeCompare(right.name);

            });

            const partnerParticipantCount =

              user.role === 'partner' &&

              (approvedPartnerProjectIds.has(project.id) ||

                Boolean(project.parentProjectId && approvedPartnerProjectIds.has(project.parentProjectId)))

                ? 1

                : 0;



            return {

              project,

              participantCount:

                Math.max(

                  members.length,

                  Math.max(

                    (project.joinedUserIds || []).length,

                    (project.volunteers || []).length

                  ) + partnerParticipantCount

                ),

              members,

            };

          })

      );



      setProposalChats(

        (user.role === 'admin' 
          ? directPartnerApplications 
          : (partnerApplicationsResult.status === 'fulfilled' ? partnerApplicationsResult.value : [])
        )

          .sort((left, right) => {

            const leftRank = left.status === 'Pending' ? 0 : 1;

            const rightRank = right.status === 'Pending' ? 0 : 1;

            if (leftRank !== rightRank) {

              return leftRank - rightRank;

            }

            return new Date(right.requestedAt).getTime() - new Date(left.requestedAt).getTime();

          })

          .map(app => ({

            application: app,

            projectTitle:

              app.proposalDetails?.proposedTitle ||

              app.proposalDetails?.targetProjectTitle ||

              'Untitled Proposal',

            programModule: app.proposalDetails?.requestedProgramModule || 'Nutrition'

          }))

      );



      console.log(`[COM-HUB] loadData: total ${Date.now() - t0}ms`);

      setLoading(false);

    } catch (e) {

      console.error(e);

      setLoading(false);

    } finally {

      loadDataInFlightRef.current = null;

    }

    })();

    loadDataInFlightRef.current = run;
    return run;

  }, [user]);



  const loadMessages = async (isInitial = false) => {

    if (!user) return;
    if (loadMessagesInFlightRef.current) return;

    loadMessagesInFlightRef.current = true;
    if (isInitial) setIsMessagesLoading(true);

    try {

      if (selectedUser) {
        const targetUserId = selectedUser.id;
        const chat = await getConversation(user.id, targetUserId);
        
        // Ensure user hasn't switched conversation while fetch was in flight
        if (selectedUserRef.current?.id !== targetUserId) return;
        
        const deduped = dedupeProposalReviewCards(chat);

        setMessages(prev => {
          if (prev.length !== deduped.length) return deduped;
          const isIdentical = prev.every((m, idx) => {
            const d = deduped[idx];
            return d && m.id === d.id && m.content === d.content && m.read === d.read;
          });
          return isIdentical ? prev : deduped;
        });

        const unread = chat.filter(m => !m.read && m.recipientId === user.id);

        if (unread.length > 0) {
          await Promise.all(unread.map(m => markMessageAsRead(m.id)));
          void loadData();
        }

      } else if (selectedProjectChat) {
        const targetProjectId = selectedProjectChat.project.id;
        const chat = await getProjectGroupMessages(targetProjectId, user.id);
        
        // Ensure project chat hasn't switched while in flight
        if (selectedProjectChatRef.current?.project.id !== targetProjectId) return;
        
        const deduped = dedupeProposalReviewCards(chat);

        setMessages(prev => {
          if (prev.length !== deduped.length) return deduped;
          const isIdentical = prev.every((m, idx) => {
            const d = deduped[idx];
            return d && m.id === d.id && m.content === d.content && m.read === d.read;
          });
          return isIdentical ? prev : deduped;
        });

      }

    } catch (e) {

      // Only log for debugging if not a known API error
      const errorMsg = e instanceof Error ? e.message : String(e);

      if (!errorMsg.includes('API request failed')) {

        console.warn(`[CommunicationHub] Error loading messages: ${errorMsg}`);

      }

    } finally {
      loadMessagesInFlightRef.current = false;
      if (isInitial) setIsMessagesLoading(false);
    }

  };



  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);

  useEffect(() => {
    selectedProjectChatRef.current = selectedProjectChat;
    setShowConversationMenu(false);
    setShowMembersModal(false);

  }, [selectedProjectChat]);



  useFocusEffect(useCallback(() => {

    void loadData();

    return subscribeToStorageChanges(['users', 'projects', 'partnerProjectApplications'], loadData);

  }, [loadData]));



  useEffect(() => {

    if (activeSection !== 'proposals') {

      return undefined;

    }



    const pollTimer = setInterval(() => {

      void loadData();

    }, 1000);



    return () => clearInterval(pollTimer);

  }, [activeSection, loadData]);



  useEffect(() => {

    if (!user?.id) {

      return;

    }



    return subscribeToMessages(user.id, event => {

      if (event.type === 'message.changed') {

        const incoming = event.message;

        const activeUser = selectedUserRef.current;

        const isActiveConversation = Boolean(

          activeUser &&

          ((incoming.senderId === user.id && incoming.recipientId === activeUser.id) ||

            (incoming.senderId === activeUser.id && incoming.recipientId === user.id))

        );



        if (isActiveConversation) {

          setMessages(current => upsertChatMessage(current, incoming));

          if (!incoming.read && incoming.recipientId === user.id) {

            void markMessageAsRead(incoming.id).then(() => {

              void loadData();

            });

          }

        } else {

          void loadData();

        }

        return;

      }



      if (event.type === 'project-group-message.changed') {

        const incoming = event.message;

        const activeProjectChat = selectedProjectChatRef.current;



        if (activeProjectChat?.project.id === incoming.projectId) {

          setMessages(current => upsertChatMessage(current, incoming));

        }

      }

    });

  }, [loadData, user?.id]);



  useEffect(() => {
    if (!user?.id || !selectedUser?.id) {
      setIsRecipientTyping(false);
      return;
    }
    return subscribeToTypingStatus(user.id, selectedUser.id, (typing) => {
      setIsRecipientTyping(typing);
    });
  }, [user?.id, selectedUser?.id]);

  useEffect(() => {
    // Immediately clear messages when switching conversation to prevent showing wrong person's messages
    setMessages([]);
    if (view === 'detail' && (selectedUser || selectedProjectChat)) {
      void loadMessages(true);

      const timer = setInterval(() => {
        void loadMessages(false);
      }, 2000);

      return () => clearInterval(timer);
    }
  }, [selectedUser?.id, selectedProjectChat?.project?.id, view]);



  useEffect(() => {

    if (!availableSections.includes(activeSection)) {

      setActiveSection(availableSections[0]);

    }

  }, [activeSection, availableSections]);



  const pendingProposalChats = proposalChats.filter(item => item.application.status === 'Pending');







  useEffect(() => {

    if (selectedUser && !allUsers.some(candidate => candidate.id === selectedUser.id)) {

      setSelectedUser(null);

    }

  }, [allUsers, selectedUser]);



  useEffect(() => {

    if (

      selectedProjectChat &&

      !projectChats.some(candidate => candidate.project.id === selectedProjectChat.project.id)

    ) {

      setSelectedProjectChat(null);

    }

  }, [projectChats, selectedProjectChat]);



  useEffect(() => {

    if (!requestedProjectId || loading) return;



    const matchedProjectChat = projectChats.find(chat => chat.project.id === requestedProjectId);

    if (matchedProjectChat) {

      setSelectedProjectChat(matchedProjectChat);

      setSelectedUser(null);

      setSelectedProposalApplication(null);

      setProposalIntent(null);

      setView('detail');

    }



    navigation.setParams({ projectId: undefined });

  }, [requestedProjectId, loading, navigation, projectChats]);



  useEffect(() => {
    if (!conversationUserId || loading) return;

    const matchedUser = allUsers.find((candidate) => candidate.id === conversationUserId) ||
      (conversationUserId === 'admin' || conversationUserId === 'admin-support'
        ? allUsers.find(candidate => candidate.role === 'admin')
        : null);

    if (matchedUser) {
      setSelectedUser(matchedUser);
      setSelectedProjectChat(null);
      setSelectedProposalApplication(null);
      setProposalIntent(null);
      setView('detail');
    }

    navigation.setParams({ conversationUserId: undefined });
  }, [conversationUserId, loading, navigation, allUsers]);

  // Handle requested proposal navigation
  useEffect(() => {
    if (!requestedProposalId || loading || proposalChats.length === 0) return;

    const matchedChat = proposalChats.find((chat) => chat.application.id === requestedProposalId);
    if (matchedChat) {
      setSelectedProposalApplication(matchedChat.application);
      setSelectedProjectChat(null);
      setSelectedUser(null);
      setProposalIntent(null);
      setView('detail');
    }

    navigation.setParams({ proposalId: undefined });
  }, [requestedProposalId, loading, navigation, proposalChats]);


  useEffect(() => {

    if (newProposalModule || newProposalProjectId) {

      // Auto-select admin
      const admin = allUsers.find(u => u.role === 'admin');
      if (admin) {
        setSelectedUser(admin);
      } else {
        setSelectedUser(null);
      }

      setSelectedProjectChat(null);
      setSelectedProposalApplication(null);
      setView('detail');

      // For partners: open inline draft card directly (image UI)
      // For others (revision mode etc.): fall back to full-screen proposalIntent form
      if (user?.role === 'partner') {
        setInlineDraftModule(newProposalModule || 'Nutrition');
        setInlineDraftProjectId(newProposalProjectId || 'new');
        setInlineDraftProposal(createEmptyProposalForm(newProposalTitle || ''));
        setInlineRegionCode('');
        setInlineCityCode('');
        setInlineFilteredCities([]);
        setInlineDraftDocAttachment('');
        setProposalIntent(null);
        setProposalRevisionMode(false);
      } else {
        setProposalIntent({
          module: newProposalModule,
          projectId: newProposalProjectId,
          title: newProposalTitle,
        });
        setProposalRevisionMode(false);
        setProposalForm(f => ({ ...f, proposedTitle: newProposalTitle || '' }));
      }

      navigation.setParams({ newProposalModule: undefined, newProposalProjectId: undefined, newProposalTitle: undefined });

    }

  }, [newProposalModule, newProposalProjectId, newProposalTitle, navigation, user?.role, allUsers]);



  // Insert a draft proposal card inline into the message thread
  const handleInsertProposalDraft = () => {
    if (!user) return;
    // Determine module/projectId from proposalIntent or defaults
    const mod = proposalIntent?.module || 'Nutrition';
    const pid = proposalIntent?.projectId || 'new';
    const title = proposalIntent?.title || '';
    setInlineDraftModule(mod);
    setInlineDraftProjectId(pid);
    setInlineDraftProposal(createEmptyProposalForm(title));
    setInlineRegionCode('');
    setInlineCityCode('');
    setInlineFilteredCities([]);
    setInlineDraftDocAttachment('');
    // Clear proposalIntent so the full-screen composer doesn't open
    setProposalIntent(null);
  };

  const handlePickInlineDraftPhoto = async () => {
    try {
      const pickedImage = await pickImageFromDevice();
      if (!pickedImage) return;
      setInlineDraftProposal(prev => prev ? { ...prev, photoAttachment: pickedImage } : prev);
    } catch (error: any) {
      Alert.alert('Photo Upload Failed', error?.message || 'Unable to upload photo.');
    }
  };

  const handlePickInlineDraftDoc = async () => {
    try {
      const docUri = await pickDocumentFromDevice();
      if (!docUri) return;
      setInlineDraftDocAttachment(docUri);
    } catch (error: any) {
      Alert.alert('File Upload Failed', error?.message || 'Unable to upload document.');
    }
  };

  const handleSubmitInlineProposal = async () => {
    if (!user || !inlineDraftProposal) return;
    setIsSubmittingInlineDraft(true);
    try {
      const attachments: { url: string; type: 'image' | 'document'; description?: string }[] = [];
      if (inlineDraftProposal.photoAttachment) {
        attachments.push({ url: inlineDraftProposal.photoAttachment, type: 'image', description: 'Proposal Photo' });
      }
      if (inlineDraftDocAttachment) {
        attachments.push({ url: inlineDraftDocAttachment, type: 'document', description: 'Proposal Document' });
      }
      const isResubmission = inlineDraftProposal?.communityNeed?.includes('[Revised]') || false;
      await submitPartnerProgramProposal(inlineDraftProjectId || 'new', user, {
        programModule: (inlineDraftModule as AdvocacyFocus) || 'Nutrition',
        proposalDetails: {
          ...inlineDraftProposal,
          proposedVolunteersNeeded: Number(inlineDraftProposal.proposedVolunteersNeeded) || 0,
          requestedProgramModule: (inlineDraftModule as AdvocacyFocus) || 'Nutrition',
          targetProjectId: inlineDraftProjectId !== 'new' ? inlineDraftProjectId : undefined,
          isResubmission: true,
          attachments,
        } as any,
      });
      setInlineDraftProposal(null);
      setInlineDraftDocAttachment('');
      Alert.alert('Submitted', 'Your revised proposal has been submitted for review.');
      void loadData();
    } catch (e) {
      Alert.alert('Error', 'Failed to submit proposal. Please check your connection.');
    } finally {
      setIsSubmittingInlineDraft(false);
    }
  };

  const handleEditProposalFromMessage = (app: any) => {
    const pd = app.proposalDetails || app || {};
    const mod = pd.requestedProgramModule || pd.programModule || app.programModule || 'Nutrition';
    const pid = pd.targetProjectId || pd.targetProjectTitle || app.projectId || 'new';
    setInlineDraftModule(mod as any);
    setInlineDraftProjectId(String(pid));
    setInlineDraftProposal({
      proposedTitle: pd.proposedTitle || app.proposedTitle || '',
      proposedDescription: pd.proposedDescription || '',
      proposedStartDate: pd.proposedStartDate || '',
      proposedEndDate: pd.proposedEndDate || '',
      proposedLocation: pd.proposedLocation || '',
      proposedVolunteersNeeded: String(pd.proposedVolunteersNeeded ?? ''),
      communityNeed: pd.communityNeed || '',
      expectedDeliverables: pd.expectedDeliverables || '',
      photoAttachment: (pd.attachments?.find((a: any) => a.type === 'image')?.url) || pd.photoAttachment || '',
    });
    const docUrl = (pd.attachments?.find((a: any) => a.type === 'document')?.url) || '';
    setInlineDraftDocAttachment(docUrl);
    // Try to hydrate region/city pickers from composed address if possible
    if (pd.proposedLocation) {
      const loc = String(pd.proposedLocation);
      // simple heuristic: if location contains region name, set code
      const regionMatch = PHRegions.find(r => loc.includes(r.name));
      if (regionMatch) {
        setInlineRegionCode(regionMatch.code);
        setInlineFilteredCities(getCitiesByRegion(regionMatch.code));
      }
    }
  };

  const handleSubmitProposalFromMessage = async (app: any) => {
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in to submit a proposal.');
      return;
    }
    // If admin, approve the underlying application instead
    if (user.role === 'admin' && app.id) {
      try {
        setIsSubmittingInlineDraft(true);
        const reviewed = await reviewPartnerProjectApplication(app.id, 'Approved', user.id);
        
        // Update local message status
        setMessages(current =>
          current.map(msg => {
            if (typeof msg.content === 'string' && msg.content.startsWith(PROPOSAL_PREFIX)) {
              try {
                const msgApp = JSON.parse(msg.content.replace(PROPOSAL_PREFIX, ''));
                if (msgApp.id === app.id || msg.id === app.id) {
                  const updatedApp = { ...msgApp, status: 'Approved' };
                  return { ...msg, content: PROPOSAL_PREFIX + JSON.stringify(updatedApp) };
                }
              } catch (_) {}
            }
            return msg;
          })
        );

        setReviewNotice({
          title: 'Proposal approved',
          message: 'The proposal was approved and a new project was created.',
          tone: 'success',
          projectId: reviewed.projectId,
        });

        Alert.alert('Approved', 'Proposal approved! New project has been created.');
        void loadData();
      } catch (e: any) {
        Alert.alert('Error', e?.message || 'Failed to approve proposal.');
      } finally {
        setIsSubmittingInlineDraft(false);
      }
      return;
    }
    const pd = app.proposalDetails || app || {};
    const attachments: any[] = Array.isArray(pd.attachments) ? pd.attachments : [];
    // fallback: if no attachments array but has photoAttachment, add it
    if (attachments.length === 0 && pd.photoAttachment) {
      attachments.push({ url: pd.photoAttachment, type: 'image', description: 'Proposal Photo' });
    }
    const targetProjectId = String(pd.targetProjectId || app.projectId || 'new');
    const mod = String(pd.requestedProgramModule || pd.programModule || 'Nutrition');
    try {
      setIsSubmittingInlineDraft(true);
      await submitPartnerProgramProposal(targetProjectId, user as any, {
        programModule: mod,
        proposalDetails: {
          proposedTitle: pd.proposedTitle || app.proposedTitle || 'Untitled Proposal',
          proposedDescription: pd.proposedDescription || '',
          proposedStartDate: pd.proposedStartDate || '',
          proposedEndDate: pd.proposedEndDate || '',
          proposedLocation: pd.proposedLocation || '',
          proposedVolunteersNeeded: Number(pd.proposedVolunteersNeeded) || 0,
          communityNeed: pd.communityNeed || '',
          expectedDeliverables: pd.expectedDeliverables || '',
          requestedProgramModule: mod as any,
          targetProjectId: targetProjectId !== 'new' ? targetProjectId : undefined,
          attachments,
        },
      });
      Alert.alert('Submitted', 'Your proposal has been submitted for review.');
      void loadData();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to submit proposal. Please check your connection.');
    } finally {
      setIsSubmittingInlineDraft(false);
    }
  };

  const handleSendProposalCard = async (overrideForm?: any) => {

    if (!user || (!selectedUser && !selectedProjectChat)) return;

    setIsSending(true);



    const formData = overrideForm || proposalForm;

    const proposalData = {

      ...formData,

      status: 'Proposed',

      proposedById: user.id,

      proposedByName: user.name,

      timestamp: new Date().toISOString(),

    };



    const msg = {

      id: `prop-${Date.now()}`,

      senderId: user.id,

      content: `${PROPOSAL_PREFIX}${JSON.stringify(proposalData)}`,

      timestamp: new Date().toISOString(),

    };



    try {

      if (selectedUser) {
        const fullMsg: Message = { ...msg, recipientId: selectedUser.id, read: false };
        setMessages(curr => upsertChatMessage(curr, fullMsg));
        await saveMessage(fullMsg);
      } else if (selectedProjectChat) {
        const fullMsg: ProjectGroupMessage = { ...msg, projectId: selectedProjectChat.project.id, kind: 'scope-proposal' as any };
        setMessages(curr => upsertChatMessage(curr, fullMsg));
        await saveProjectGroupMessage(fullMsg);
      }

    } catch (e) {

      const errorMsg = e instanceof Error ? e.message : 'Failed to send proposal card';

      Alert.alert('Error', `Failed to send proposal card: ${errorMsg}`);

    } finally {

      setIsSending(false);

    }

  };



  const handleApproveProposal = async (msgId: string, currentData: any) => {

    if (user?.role !== 'admin') return;



    const updatedData = { ...currentData, status: 'Approved', approvedBy: user.id, approvedAt: new Date().toISOString() };

    const updatedContent = `${PROPOSAL_PREFIX}${JSON.stringify(updatedData)}`;



    try {

      // In a real app, we'd update the specific message. Here we send an "Approval" message or update local state.

      // For this demo, let's send a final approved card.

      const msg = {

        id: `appr-${Date.now()}`,

        senderId: user.id,

        content: updatedContent,

        timestamp: new Date().toISOString(),

      };



      setMessages(curr => upsertChatMessage(curr, msg as any));
      if (selectedUser) {
        await saveMessage({ ...msg, recipientId: selectedUser.id, read: false });
      }

      Alert.alert('Approved', 'The proposal has been officially approved.');

    } catch (e) {

      Alert.alert('Error', 'Failed to approve proposal');

    }

  };



  useEffect(() => {

    if (scrollRef.current) {

      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    }

  }, [messages]);

  useEffect(() => {
    if (!reviewNotice || reviewNotice.tone !== 'success' || !reviewNotice.projectId) {
      return;
    }

    const timer = setTimeout(() => {
      navigateToAvailableRoute(
        navigation,
        'Projects',
        { projectId: reviewNotice.projectId, programSuiteView: 'projects' },
        { routeName: 'Projects', params: { projectId: reviewNotice.projectId, programSuiteView: 'projects' } }
      );
    }, 250);

    return () => clearTimeout(timer);
  }, [navigation, reviewNotice]);



  const handlePickAttachment = async (type: 'photo' | 'file') => {

    try {

      setShowAttachmentMenu(false);

      const uri = type === 'photo'

        ? await pickImageFromDevice()

        : await pickDocumentFromDevice();



      if (!uri) {

        return;

      }



      setPendingAttachments(current => [...current, uri]);

    } catch (error) {

      Alert.alert(

        type === 'photo' ? 'Photo Upload Failed' : 'File Upload Failed',

        error instanceof Error ? error.message : 'Unable to attach this file. Please try again.'

      );

    }

  };



  const handlePickProposalPhoto = async () => {
    try {
      const pickedImage = await pickImageFromDevice();
      if (!pickedImage) {
        return;
      }
      setProposalForm(current => ({ ...current, photoAttachment: pickedImage }));
    } catch (error: any) {
      Alert.alert('Photo Upload Failed', error?.message || 'Unable to upload a photo. Please try again.');
    }
  };

  const handleRemoveProposalPhoto = () => {
    setProposalForm(current => ({ ...current, photoAttachment: '' }));
  };

  const closeProposalComposer = () => {
    setProposalForm(createEmptyProposalForm());
    setProposalRevisionMode(false);
    setProposalIntent(null);
    navigation.setParams({
      newProposalModule: undefined,
      newProposalProjectId: undefined,
      newProposalTitle: undefined,
    });
    setView(isWide ? 'detail' : 'sidebar');
  };

  const closeActiveConversation = () => {

    setSelectedUser(null);

    setSelectedProjectChat(null);

    setSelectedProposalApplication(null);

    setProposalIntent(null);

    setProposalRevisionMode(false);

    setShowConversationMenu(false);

    setMessages([]);

    if (!isWide) {

      setView('sidebar');

    }

  };



  const [previewImageUri, setPreviewImageUri] = useState<string | null>(null);

  const handleOpenProposalAttachment = async (uri: string, attachmentIndex: number) => {

    const normalizedUri = String(uri || '').trim();

    if (!normalizedUri) {

      return;

    }

    // Check if it's an image
    const isImage = isImageMediaUri(normalizedUri);

    try {

      if (Platform.OS === 'web') {
        if (isImage) {
          // For images, show in preview modal
          setPreviewImageUri(normalizedUri);
          return;
        }
        
        // For non-images, download as before
        if (typeof document !== 'undefined') {
          const link = document.createElement('a');
          link.href = normalizedUri;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.download = getAttachmentName(normalizedUri, attachmentIndex);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
        return;
      }

      await Linking.openURL(normalizedUri);

    } catch {

      Alert.alert('Attachment Unavailable', 'Unable to open or download this attachment right now.');

    }

  };



  const removePendingAttachment = (attachmentUri: string) => {

    setPendingAttachments(current => current.filter(uri => uri !== attachmentUri));

  };



  const handleLeaveEventGc = () => {

    if (!user?.id || user.role !== 'volunteer' || !selectedProjectChat) {

      return;

    }



    const eventTitle = selectedProjectChat.project.title;

    const previousProjectChats = projectChats;

    const previousSelectedProjectChat = selectedProjectChat;

    const previousMessages = messages;

    setShowConversationMenu(false);

    setProjectChats(currentChats =>

      currentChats.filter(chat => chat.project.id !== selectedProjectChat.project.id)

    );

    setSelectedProjectChat(null);

    setMessages([]);

    setView(isWide ? 'detail' : 'sidebar');

    setReviewNotice({

      title: 'Left event GC',

      message: `You left "${eventTitle}".`,

      tone: 'warning',

    });



    void (async () => {

      try {

        await leaveVolunteerEventGroup(previousSelectedProjectChat.project.id, user.id);

        void loadData();

      } catch (error) {

        setProjectChats(previousProjectChats);

        setSelectedProjectChat(previousSelectedProjectChat);

        setMessages(previousMessages);

        setView(isWide ? 'detail' : 'sidebar');

        Alert.alert(

          'Unable to Leave',

          getRequestErrorMessage(error, 'Failed to leave this event group chat. Please try again.')

        );

      }

    })();

  };



  const handleOpenGcProjectDetails = () => {

    if (!selectedProjectChat) {

      return;

    }



    setShowConversationMenu(false);

    navigateToAvailableRoute(navigation, 'Projects', { projectId: selectedProjectChat.project.id });

  };



  const handleOpenGcMembers = () => {

    if (!selectedProjectChat) {

      return;

    }



    setShowConversationMenu(false);

    setShowMembersModal(true);

  };



  const handleDeleteEventGc = () => {

    if (!user || user.role !== 'admin' || !selectedProjectChat) {

      return;

    }



    const targetProject = selectedProjectChat.project;

    const previousProjectChats = projectChats;

    const previousSelectedProjectChat = selectedProjectChat;

    const previousMessages = messages;

    setConversationMenuAction('delete-gc');

    setShowConversationMenu(false);

    setProjectChats(currentChats =>

      currentChats.filter(chat => chat.project.id !== targetProject.id)

    );

    setSelectedProjectChat(null);

    setMessages([]);

    setView(isWide ? 'detail' : 'sidebar');

    setReviewNotice({

      title: 'GC deleted',

      message: `The group chat for "${targetProject.title}" has been removed.`,

      tone: 'warning',

    });



    void (async () => {

      try {

        const latestProject = await getProject(targetProject.id);

        if (!latestProject) {

          throw new Error('Project not found.');

        }



        const nextProject = {

          ...latestProject,

          groupChatDisabled: true,

          updatedAt: new Date().toISOString(),

        };



        if (latestProject.isEvent) {

          await saveEvent(nextProject);

        } else {

          await saveProject(nextProject);

        }



        await deleteProjectGroupChat(latestProject.id);

        void loadData();

      } catch (error) {

        setProjectChats(previousProjectChats);

        setSelectedProjectChat(previousSelectedProjectChat);

        setMessages(previousMessages);

        setView(isWide ? 'detail' : 'sidebar');

        Alert.alert(

          'Unable to delete GC',

          getRequestErrorMessage(error, 'Failed to delete this group chat. Please try again.')

        );

      } finally {

        setConversationMenuAction(null);

      }

    })();

  };

  const handleDeleteMessage = (messageId: string, isProjectMsg: boolean) => {
    if (!messageId) return;
    Alert.alert('Delete message?', 'This will delete the message for everyone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const previous = messages;
          setMessages(curr => curr.filter(m => m.id !== messageId));
          try {
            if (isProjectMsg) {
              await deleteProjectGroupMessage(messageId);
            } else {
              await deleteMessage(messageId);
            }
          } catch (e) {
            setMessages(previous);
            Alert.alert('Failed to delete', getRequestErrorMessage(e, 'Could not delete message.'));
          }
        },
      },
    ]);
  };



  const handleSendMessage = async () => {

    const trimmedMessage = messageText.trim();

    if (!user || (!trimmedMessage && pendingAttachments.length === 0) || isSending) return;
    if (!selectedUser && !selectedProjectChat) {
      Alert.alert('Select a conversation', 'Please select a chat before sending a message.');
      return;
    }

    setIsSending(true);
    setShowEmojiPicker(false);

    const msg = {

      id: `msg-${Date.now()}`,

      senderId: user.id,

      content: trimmedMessage || 'Attachment',

      timestamp: new Date().toISOString(),

      attachments: pendingAttachments,

    };

    // Keep copies for optimistic update so we can revert on hard failure
    const optimisticText = trimmedMessage;
    const optimisticAttachments = [...pendingAttachments];

    try {

      if (selectedUser) {
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        void setTypingStatus(user.id, selectedUser.id, false);
        const fullMsg: Message = { ...msg, recipientId: selectedUser.id, read: false };
        // Optimistic UI — shows instantly even if Firestore is slow/disabled
        setMessages(curr => upsertChatMessage(curr, fullMsg));
        setMessageText('');
        setPendingAttachments([]);
        setIsSending(false);
        // Firestore save — non-blocking; keep message locally on failure
        try {
          await Promise.race([
            saveMessage(fullMsg),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Save timeout')), 8000)),
          ]);
          // Refresh messages and conversation lists immediately after sending
          void loadMessages();
          void loadData();
        } catch (saveErr: any) {
          const code = String(saveErr?.code || saveErr?.message || '');
          // If Firestore is disabled (PERMISSION_DENIED) we keep the optimistic message and warn
          console.warn('[Chat] saveMessage failed (kept locally):', code, saveErr);
          // Don't revert — message stays visible; optionally could store locally
        }
        return;
      } else if (selectedProjectChat) {

        const fullMsg: ProjectGroupMessage = { ...msg, projectId: selectedProjectChat.project.id, kind: 'message' };

        setMessages(curr => upsertChatMessage(curr, fullMsg));
        setMessageText('');
        setPendingAttachments([]);
        setIsSending(false);
        try {
          await Promise.race([
            saveProjectGroupMessage(fullMsg),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Save timeout')), 8000)),
          ]);
          // Refresh project messages and conversation lists immediately after sending
          void loadMessages();
          void loadData();
        } catch (saveErr: any) {
          console.warn('[Chat] saveProjectGroupMessage failed (kept locally):', saveErr);
        }
        return;
      }

    } catch (e) {

      const errorMsg = e instanceof Error ? e.message : 'Failed to send message';
      // Revert optimistic on hard error before save
      setMessageText(optimisticText);
      Alert.alert('Error', `Failed to send message: ${errorMsg}`);

    } finally {

      setIsSending(false);

    }

  };



  const handleSubmitProposal = async () => {

    if (!user || !proposalIntent) return;

    try {

      const proposalAttachments = proposalForm.photoAttachment
        ? [{ url: proposalForm.photoAttachment, type: 'image' as const }]
        : [];

      await submitPartnerProgramProposal(proposalIntent.projectId || 'new', user, {

        programModule: (proposalIntent.module as AdvocacyFocus) || 'Nutrition',

        proposalDetails: {

          ...proposalForm,

          proposedVolunteersNeeded: Number(proposalForm.proposedVolunteersNeeded) || 0,

          requestedProgramModule: (proposalIntent.module as AdvocacyFocus) || 'Nutrition',

          targetProjectId: proposalIntent.projectId,

          attachments: proposalAttachments,

        }

      });

      closeProposalComposer();

      Alert.alert('Success', 'Your proposal has been submitted for review.');

      void loadData();

    } catch (e) {

      Alert.alert('Error', 'Failed to submit proposal. Please check your connection.');

    }

  };



  useEffect(() => {

    const composed = composePhilippineAddress(locRegion, locCity, '');

    setProposalForm(f => ({ ...f, proposedLocation: composed }));

  }, [locRegion, locCity]);



  useEffect(() => {

    if (!reviewNotice || reviewNotice.projectId) {

      return undefined;

    }



    const timer = setTimeout(() => {

      setReviewNotice(null);

    }, 4500);



    return () => clearTimeout(timer);

  }, [reviewNotice]);



  const handleRejectWithNotes = (app: PartnerProjectApplication) => {

    setRejectionNotes('');

    setPendingRejectApp(app);

    setShowRejectionModal(true);

  };



  const handleReview = async (app: PartnerProjectApplication, status: 'Approved' | 'Rejected' | 'Revision Requested' | 'Needs Revision', notes?: string) => {
    if (!user) return;
    if (status === 'Approved') setIsApproving(true);

    const previousProposalChats = proposalChats;
    const previousSelectedProposalApplication = selectedProposalApplication;

    try {
      const reviewedApplication = await reviewPartnerProjectApplication(app.id, status, user?.id || '', notes);

      setProposalChats(current =>
        current.map(item =>
          item.application.id === reviewedApplication.id
            ? {
                ...item,
                application: reviewedApplication,
                projectTitle:
                  reviewedApplication.proposalDetails?.proposedTitle ||
                  reviewedApplication.proposalDetails?.targetProjectTitle ||
                  item.projectTitle,
              }
            : item
        )
      );
      
      setMessages(current =>
        current.map(msg => {
          if (typeof msg.content === 'string' && msg.content.startsWith(PROPOSAL_PREFIX)) {
            try {
              const msgApp = JSON.parse(msg.content.replace(PROPOSAL_PREFIX, ''));
              if (msgApp.id === reviewedApplication.id) {
                const updatedApp = { ...msgApp, status: reviewedApplication.status };
                return { ...msg, content: PROPOSAL_PREFIX + JSON.stringify(updatedApp) };
              }
            } catch (e) {
            }
          }
          return msg;
        })
      );

      setReviewNotice(
        status === 'Approved'
          ? { title: 'Proposal approved', message: 'The proposal was approved and a new project was created.', tone: 'success', projectId: reviewedApplication.projectId }
          : status === 'Revision Requested' || status === 'Needs Revision'
          ? { title: 'Revision requested', message: 'Revision requested. Feedback has been sent to the partner.', tone: 'warning' }
          : { title: 'Proposal rejected', message: 'The proposal was rejected. A notification card has been sent to the partner.', tone: 'warning' }
      );

      if (selectedProposalApplication?.id === reviewedApplication.id) {
        setSelectedProposalApplication(reviewedApplication);
      }

      if (
        activeProposalCardData &&
        (activeProposalCardData.applicationId === reviewedApplication.id || activeProposalCardData.id === reviewedApplication.id)
      ) {
        setActiveProposalCardData((prev: any) =>
          prev
            ? {
                ...prev,
                status: reviewedApplication.status,
                reviewNotes: reviewedApplication.reviewNotes || prev.reviewNotes,
              }
            : prev
        );
      }

      setView(isWide ? 'detail' : 'sidebar');

      void loadData();
      if (selectedUser) {
        void loadMessages();
      }

      if (status === 'Approved') {
        setIsApproving(false);
      }

    } catch (e) {

      if (status === 'Approved') setIsApproving(false);
      setProposalChats(previousProposalChats);

      setSelectedProposalApplication(previousSelectedProposalApplication);

      setView(isWide ? 'detail' : 'sidebar');

      Alert.alert('Error', 'Failed to complete review.');

    }

  };


  const openProposalRevision = (cardData: any) => {
    if (!user) return;

    const requestedProgramModule = String(cardData.requestedProgramModule || cardData.programModule || 'Nutrition');
    const targetProjectId = String(cardData.targetProjectId || cardData.projectId || 'new');
    const title = String(cardData.proposedTitle || cardData.title || '');

    setProposalIntent({
      module: requestedProgramModule,
      projectId: targetProjectId,
      title,
    });
    setProposalRevisionMode(true);

    setProposalForm({
      proposedTitle: title,
      proposedDescription: String(cardData.proposedDescription || ''),
      proposedStartDate: String(cardData.proposedStartDate || ''),
      proposedEndDate: String(cardData.proposedEndDate || ''),
      proposedLocation: String(cardData.proposedLocation || ''),
      proposedVolunteersNeeded: String(cardData.proposedVolunteersNeeded || ''),
      communityNeed: String(cardData.communityNeed || ''),
      expectedDeliverables: String(cardData.expectedDeliverables || ''),
    });

    setView('detail');
    setActiveProposalCardData(null);
  };

  const formatMessageSubtitle = (msg?: Message | null, defaultText = 'Start a conversation'): string => {
    if (!msg || !msg.content) return defaultText;
    if (typeof msg.content === 'string' && msg.content.startsWith(PROPOSAL_PREFIX)) {
      try {
        const parsed = JSON.parse(msg.content.replace(PROPOSAL_PREFIX, ''));
        const title = parsed?.proposalDetails?.proposedTitle || parsed?.proposedTitle || 'Project Specifications';
        return `📋 ${title}`;
      } catch {
        return '📋 Project Specifications';
      }
    }
    return msg.content;
  };

  const filteredConversations = conversations.filter(c => c.user.name.toLowerCase().includes(searchText.toLowerCase()));
  const adminConversations = filteredConversations.filter(c => c.user.role === 'admin');
  const partnerConversations = filteredConversations.filter(c => c.user.role === 'partner');
  const volunteerConversations = filteredConversations.filter(c => c.user.role === 'volunteer');
  const filteredProjects = projectChats.filter(c => c.project.title.toLowerCase().includes(searchText.toLowerCase()));

  const filteredProposals = proposalChats.filter(c => c.application.partnerName.toLowerCase().includes(searchText.toLowerCase()) || c.projectTitle.toLowerCase().includes(searchText.toLowerCase()));

  const filteredUsers = allUsers.filter(u => u.name.toLowerCase().includes(searchText.toLowerCase()));

  const pendingProposalCount = pendingProposalChats.length;



  const renderSidebarItem = (

    id: string,

    title: string,

    subtitle: string,

    active: boolean,

    onPress: () => void,

    options?: { avatar?: string; icon?: string; badge?: number; color?: string }

  ) => (

    <TouchableOpacity

      key={id}

      style={[styles.sidebarItem, active && styles.sidebarItemActive]}

      onPress={onPress}

      activeOpacity={0.7}

    >

      <View style={[styles.sidebarAvatar, { backgroundColor: options?.color || '#166534' }]}>

        {options?.icon ? (

          <MaterialIcons name={options.icon as any} size={20} color="#fff" />

        ) : (

          <Text style={styles.sidebarAvatarText}>{title[0].toUpperCase()}</Text>

        )}

      </View>

      <View style={styles.sidebarItemInfo}>

        <View style={styles.sidebarItemHeader}>

          <Text style={[styles.sidebarItemTitle, active && styles.sidebarItemTitleActive]} numberOfLines={1}>

            {title}

          </Text>

          {options?.badge ? (

            <View style={styles.sidebarBadge}>

              <Text style={styles.sidebarBadgeText}>{options.badge}</Text>

            </View>

          ) : null}

        </View>

        <Text style={[styles.sidebarItemSubtitle, active && styles.sidebarItemSubtitleActive]} numberOfLines={1}>

          {subtitle}

        </Text>

      </View>

    </TouchableOpacity>

  );



  const renderSidebar = () => (

    <View style={[styles.sidebar, !isWide && view === 'detail' && styles.hidden]}>

        <View style={styles.sidebarHeader}>
          <AppLogo />
          <TouchableOpacity
            style={styles.sidebarHeaderAction}
            onPress={() => {
              const adminUser = allUsers.find(u => u.role === 'admin') || allUsers[0];
              if ((isVolunteer || isPartner) && adminUser) {
                setSelectedUser(adminUser);
                setSelectedProjectChat(null);
                setSelectedProposalApplication(null);
                setProposalIntent(null);
                setView('detail');
              } else if (availableSections.includes('contacts')) {
                setActiveSection('contacts');
              } else if (allUsers.length > 0) {
                setSelectedUser(allUsers[0]);
                setSelectedProjectChat(null);
                setSelectedProposalApplication(null);
                setProposalIntent(null);
                setView('detail');
              }
            }}
            activeOpacity={0.8}
            accessibilityLabel="New conversation"
          >
            <MaterialIcons name="add" size={24} color="#166534" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search messages, volunteers, or announcements"
            value={searchText}
            onChangeText={setSearchText}
            placeholderTextColor="#94a3b8"
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sectionTabs} contentContainerStyle={styles.sectionTabsContent}>
            {['messages', 'updates', 'projects'].map(section => {
              const isUpdates = section === 'updates';
              const label = section === 'messages' ? 'Messages' : section === 'updates' ? 'Updates' : 'Event Group Chat';
              return (
                <TouchableOpacity
                  key={section}
                  onPress={() => !isUpdates && setActiveSection(section as any)}
                  style={[
                    styles.sectionTab,
                    activeSection === section && styles.sectionTabActive
                  ]}
                >
                  <Text style={[
                    styles.sectionTabText,
                    activeSection === section && styles.sectionTabTextActive
                  ]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

      <ScrollView
        style={styles.sidebarList}
        contentContainerStyle={styles.sidebarListContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {activeSection === 'messages' && (

          <>

              {adminConversations.length === 0 && partnerConversations.length === 0 && volunteerConversations.length === 0 ? (
                <View style={styles.emptyStateContainer}>
                  <View style={styles.emptyStateIllustration}>
                    <MaterialCommunityIcons name="chat-processing-outline" size={80} color="#bbf7d0" style={{ position: 'absolute' }} />
                    <MaterialCommunityIcons name="star-four-points" size={24} color="#fcd34d" style={{ position: 'absolute', top: -10, right: -10 }} />
                  </View>
                  <Text style={styles.emptyStateTitle}>No messages yet</Text>
                  <Text style={styles.emptyStateSubtitle}>When you start a conversation or receive a message, it will appear here.</Text>
                  <TouchableOpacity
                    style={styles.emptyStateButton}
                    onPress={() => {
                      const adminUser = allUsers.find(u => u.role === 'admin') || allUsers[0];
                      if (adminUser) {
                        setSelectedUser(adminUser);
                        setSelectedProjectChat(null);
                        setSelectedProposalApplication(null);
                        setProposalIntent(null);
                        setView('detail');
                      } else if (availableSections.includes('contacts')) {
                        setActiveSection('contacts');
                      }
                    }}
                  >
                    <MaterialIcons name="support-agent" size={18} color="#fff" />
                    <Text style={styles.emptyStateButtonText}>Message Admin Support</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  {adminConversations.length > 0 && (
                    <>
                      <Text style={styles.listSectionLabel}>Admin Support</Text>
                      {adminConversations.map(c => renderSidebarItem(
                        c.user.id,
                        c.user.name,
                        formatMessageSubtitle(c.lastMessage, 'Tap to chat with Admin'),
                        selectedUser?.id === c.user.id,
                        () => { setSelectedUser(c.user); setSelectedProjectChat(null); setSelectedProposalApplication(null); setProposalIntent(null); setView('detail'); },
                        { badge: c.unreadCount }
                      ))}
                    </>
                  )}

                  {partnerConversations.length > 0 && (
                    <>
                      <Text style={styles.listSectionLabel}>Proposal Partners</Text>
                      {partnerConversations.map(c => renderSidebarItem(
                        c.user.id,
                        c.user.name,
                        formatMessageSubtitle(c.lastMessage, 'Start a conversation'),
                        selectedUser?.id === c.user.id,
                        () => { setSelectedUser(c.user); setSelectedProjectChat(null); setSelectedProposalApplication(null); setProposalIntent(null); setView('detail'); },
                        { badge: c.unreadCount }
                      ))}
                    </>
                  )}
                  
                  {volunteerConversations.length > 0 && (
                    <>
                      <Text style={styles.listSectionLabel}>Volunteers</Text>
                      {volunteerConversations.map(c => renderSidebarItem(
                        c.user.id,
                        c.user.name,
                        formatMessageSubtitle(c.lastMessage, 'Start a conversation'),
                        selectedUser?.id === c.user.id,
                        () => { setSelectedUser(c.user); setSelectedProjectChat(null); setSelectedProposalApplication(null); setProposalIntent(null); setView('detail'); },
                        { badge: c.unreadCount }
                      ))}
                    </>
                  )}
                </>
              )}

          </>

        )}



        {activeSection === 'projects' && (

          <>

            <Text style={styles.listSectionLabel}>Event GC</Text>

            {filteredProjects.length > 0 ? (

              filteredProjects.map(p => renderSidebarItem(

                p.project.id,

                p.project.title,

                `${p.participantCount} participants`,

                selectedProjectChat?.project.id === p.project.id,

                () => { setSelectedProjectChat(p); setSelectedUser(null); setSelectedProposalApplication(null); setProposalIntent(null); setView('detail'); },

                { icon: 'groups' }

              ))

            ) : (

              <Text style={styles.emptyListText}>

                {isVolunteer ? 'No joined event GC yet' : 'No event GC available'}

              </Text>

            )}

          </>

        )}



        {activeSection === 'proposals' && (

          <>

            <Text style={styles.listSectionLabel}>

              {pendingProposalCount > 0

                ? `Project Proposals • ${pendingProposalCount} pending`

                : 'Project Proposals'}

            </Text>

            {filteredProposals.length > 0 ? (

              filteredProposals.map(p => renderSidebarItem(

                p.application.id,

                p.projectTitle,

                `${p.application.partnerName} • ${p.application.status}`,

                selectedProposalApplication?.id === p.application.id,

                () => { setSelectedProposalApplication(p.application); setSelectedUser(null); setSelectedProjectChat(null); setProposalIntent(null); setView('detail'); },

                {

                  icon: 'description',

                  color:

                    p.application.status === 'Approved'

                      ? '#166534'

                      : p.application.status === 'Rejected'

                      ? '#dc2626'

                      : '#f59e0b',

                  badge: p.application.status === 'Pending' ? 1 : (p.application.status === 'Rejected' ? 1 : undefined),

                }

              ))

            ) : (
              <View style={styles.emptyStateContainer}>
                <View style={styles.emptyStateIllustration}>
                  <MaterialIcons name="description" size={64} color="#bbf7d0" />
                </View>
                <Text style={styles.emptyStateTitle}>No Proposals Yet</Text>
                <Text style={styles.emptyStateSubtitle}>
                  {user?.role === 'partner'
                    ? 'Submit a program proposal to collaborate with NVC and launch community projects.'
                    : 'Submitted partner proposals will appear here for admin review and real-time collaboration.'}
                </Text>
                {user?.role === 'partner' ? (
                  <TouchableOpacity
                    style={styles.emptyStateButton}
                    onPress={() => {
                      setInlineDraftModule('Nutrition');
                      setInlineDraftProjectId('new');
                      setInlineDraftProposal(createEmptyProposalForm());
                      setView('detail');
                    }}
                  >
                    <MaterialIcons name="add-circle" size={18} color="#fff" />
                    <Text style={styles.emptyStateButtonText}>Submit New Proposal</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.emptyStateButton}
                    onPress={() => {
                      navigateToAvailableRoute(navigation, 'Projects', { programSuiteView: 'projects' });
                    }}
                  >
                    <MaterialIcons name="folder-open" size={18} color="#fff" />
                    <Text style={styles.emptyStateButtonText}>Explore Programs</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

          </>

        )}



        {activeSection === 'contacts' && (

          <>

            <Text style={styles.listSectionLabel}>All Contacts</Text>

            {filteredUsers.length > 0 ? (

              filteredUsers.map(u => renderSidebarItem(

                u.id,

                u.name,

                u.role.toUpperCase(),

                selectedUser?.id === u.id,

                () => { setSelectedUser(u); setSelectedProjectChat(null); setSelectedProposalApplication(null); setProposalIntent(null); setView('detail'); }

              ))

            ) : (

              <Text style={styles.emptyListText}>No contacts found</Text>

            )}

          </>

        )}

      </ScrollView>

    </View>

  );



  const renderDetail = () => {

    if (!isWide && view === 'sidebar') return null;



    if (proposalIntent) {

      return (

        <View style={styles.detail}>

          <View style={[styles.detailHeader, !isWide && { paddingTop: insets.top, height: 70 + insets.top }]}>

            {!isWide && (

              <TouchableOpacity onPress={() => setView('sidebar')} style={styles.backButton}>

                <Ionicons name="arrow-back" size={24} color="#166534" />

              </TouchableOpacity>

            )}

            <View style={{ flex: 1, flexShrink: 1 }}>

              <Text style={styles.detailTitle} numberOfLines={1} ellipsizeMode="tail">New Project Proposal</Text>

              <Text style={styles.detailSubtitle} numberOfLines={1} ellipsizeMode="tail">Track: {proposalIntent.module}</Text>

            </View>

          </View>



          <ScrollView contentContainerStyle={styles.detailScrollContent}>

            <View style={styles.proposalCard}>

              <View style={styles.proposalHeader}>

                <Ionicons name="document-text" size={32} color="#166534" />

                <View>

                  <Text style={styles.proposalTitle}>Project Specifications</Text>

                  <Text style={styles.proposalMeta}>Provide details for the {proposalIntent.module} program</Text>

                </View>

              </View>



              <View style={styles.formGroup}>

                <Text style={styles.formLabel}>Project Title</Text>

                <TextInput

                  style={styles.formInput}

                  placeholder="e.g. Community Nutrition Drive 2024"

                  value={proposalForm.proposedTitle}

                  onChangeText={t => setProposalForm(f => ({ ...f, proposedTitle: t }))}

                />

              </View>



              <View style={styles.formGroup}>

                <Text style={styles.formLabel}>Detailed Description</Text>

                <TextInput

                  style={[styles.formInput, { height: 120, textAlignVertical: 'top' }]}

                  multiline

                  placeholder="Outline the goals, target beneficiaries, and scope..."

                  value={proposalForm.proposedDescription}

                  onChangeText={t => setProposalForm(f => ({ ...f, proposedDescription: t }))}

                />

              </View>



              <View style={styles.formRow}>

                <View style={[styles.formGroup, { flex: 1 }]}>

                  <Text style={styles.formLabel}>Start Date</Text>

                  <TouchableOpacity

                    style={styles.pickerTrigger}

                    onPress={() => setShowStartDatePicker(true)}

                  >

                    <MaterialIcons name="calendar-today" size={18} color="#166534" />

                    <Text style={[styles.pickerTriggerText, !proposalForm.proposedStartDate && styles.pickerPlaceholder]}>

                      {proposalForm.proposedStartDate || 'Select date'}

                    </Text>

                  </TouchableOpacity>

                  {showStartDatePicker && (

                    <LazyDateTimePicker

                      value={proposalForm.proposedStartDate ? new Date(proposalForm.proposedStartDate) : new Date()}

                      mode="date"

                      display={Platform.OS === 'ios' ? 'inline' : 'calendar'}

                      onChange={(event: any, date?: Date) => {

                        setShowStartDatePicker(false);

                        if (date) setProposalForm(f => ({ ...f, proposedStartDate: date.toISOString().split('T')[0] }));

                      }}

                    />

                  )}

                </View>

                <View style={[styles.formGroup, { flex: 1 }]}>

                  <Text style={styles.formLabel}>End Date</Text>

                  <TouchableOpacity

                    style={styles.pickerTrigger}

                    onPress={() => setShowEndDatePicker(true)}

                  >

                    <MaterialIcons name="calendar-today" size={18} color="#166534" />

                    <Text style={[styles.pickerTriggerText, !proposalForm.proposedEndDate && styles.pickerPlaceholder]}>

                      {proposalForm.proposedEndDate || 'Select date'}

                    </Text>

                  </TouchableOpacity>

                  {showEndDatePicker && (

                    <LazyDateTimePicker

                      value={proposalForm.proposedEndDate ? new Date(proposalForm.proposedEndDate) : new Date()}

                      mode="date"

                      display={Platform.OS === 'ios' ? 'inline' : 'calendar'}

                      onChange={(event: any, date?: Date) => {

                        setShowEndDatePicker(false);

                        if (date) setProposalForm(f => ({ ...f, proposedEndDate: date.toISOString().split('T')[0] }));

                      }}

                    />

                  )}

                </View>

              </View>



              <View style={styles.formGroup}>

                <Text style={styles.formLabel}>Target Location</Text>

                <View style={styles.addressContainer}>

                  <View style={styles.pickerWrap}>

                    <Text style={styles.pickerLabel}>Region</Text>

                    <View style={styles.pickerBorder}>

                      <Picker

                        selectedValue={selectedRegionCode}

                        onValueChange={(code) => {

                          setSelectedRegionCode(code);

                          const region = PHRegions.find(r => r.code === code);

                          setLocRegion(region ? region.name : '');

                          setFilteredCities(getCitiesByRegion(code));

                          setSelectedCityCode('');

                          setLocCity('');

                        }}

                        style={styles.picker}

                      >

                        <Picker.Item label="Select Region" value="" color="#94a3b8" />

                        {PHRegions.map(r => <Picker.Item key={r.code} label={r.name} value={r.code} />)}

                      </Picker>

                    </View>

                  </View>



                  <View style={styles.pickerWrap}>

                    <Text style={styles.pickerLabel}>City / Municipality</Text>

                    <View style={styles.pickerBorder}>

                      <Picker

                        selectedValue={selectedCityCode}

                        enabled={!!selectedRegionCode}

                        onValueChange={(code) => {

                          setSelectedCityCode(code);

                          const city = filteredCities.find(c => c.code === code);

                          setLocCity(city ? city.name : '');

                        }}

                        style={styles.picker}

                      >

                        <Picker.Item label="Select City" value="" color="#94a3b8" />

                        {filteredCities.map(c => <Picker.Item key={c.code} label={c.name} value={c.code} />)}

                      </Picker>

                    </View>

                  </View>

                </View>

              </View>



              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Proposal Photo</Text>
                <TouchableOpacity style={styles.photoUploadButton} onPress={handlePickProposalPhoto}>
                  <MaterialIcons name="photo-camera" size={18} color="#ffffff" />
                  <Text style={styles.photoUploadButtonText}>
                    {proposalForm.photoAttachment ? 'Change Photo' : 'Attach Photo'}
                  </Text>
                </TouchableOpacity>
                {proposalForm.photoAttachment ? (
                  <View style={styles.photoPreviewContainer}>
                    <Image source={{ uri: proposalForm.photoAttachment }} style={styles.photoPreview} resizeMode="cover" />
                    <TouchableOpacity style={styles.photoRemoveButton} onPress={handleRemoveProposalPhoto}>
                      <Text style={styles.photoRemoveButtonText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>

              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmitProposal}>

                <Text style={styles.submitBtnText}>
                  {proposalRevisionMode ? 'Revise & Resubmit' : 'Submit Proposal for Review'}
                </Text>

                <MaterialIcons name="send" size={20} color="#fff" />

              </TouchableOpacity>

            </View>

          </ScrollView>

        </View>

      );

    }



    if (selectedProposalApplication) {

      const app = selectedProposalApplication;

      const proposalDetails: Partial<PartnerProjectProposalDetails> = app.proposalDetails || {};

      const proposalAttachments = Array.isArray(proposalDetails.attachments) ? proposalDetails.attachments : [];

      const proposalSkills = Array.isArray(proposalDetails.skillsNeeded) ? proposalDetails.skillsNeeded : [];

      const proposalTitle =

        String(proposalDetails.proposedTitle || '').trim() ||

        String(proposalDetails.targetProjectTitle || '').trim() ||

        'Untitled Proposal';

      return (

        <View style={styles.detail}>

          <View style={[styles.detailHeader, !isWide && { paddingTop: insets.top, height: 70 + insets.top }]}>

            {!isWide && (

              <TouchableOpacity onPress={() => setView('sidebar')} style={styles.backButton}>

                <Ionicons name="arrow-back" size={24} color="#166534" />

              </TouchableOpacity>

            )}

            <View style={{ flex: 1, flexShrink: 1 }}>

              <Text style={styles.detailTitle} numberOfLines={1} ellipsizeMode="tail">Proposal Review</Text>

              <Text style={styles.detailSubtitle} numberOfLines={1} ellipsizeMode="tail">{app.partnerName}</Text>

            </View>

          </View>



          <ScrollView contentContainerStyle={styles.detailScrollContent}>

            <View style={styles.proposalCard}>

              <View style={styles.statusBanner}>

                <MaterialIcons name="info" size={20} color={app.status === 'Approved' ? '#166534' : '#f59e0b'} />

                <View style={{ flexDirection: 'column' }}>
                  <Text style={[styles.statusText, { color: app.status === 'Approved' ? '#166534' : '#f59e0b' }]}>
                    Current Status: {app.status}
                  </Text>
                  {(app.proposalDetails?.targetProjectTitle || app.proposalDetails?.requestedProgramModule) && (
                    <Text style={[styles.statusText, { color: app.status === 'Approved' ? '#166534' : '#f59e0b', fontSize: 12, marginTop: 2, fontWeight: '600' }]}>
                      Program: {app.proposalDetails?.targetProjectTitle || app.proposalDetails?.requestedProgramModule}
                    </Text>
                  )}
                </View>

              </View>



              <View style={styles.reviewWorkflowCard}>

                <Text style={styles.reviewWorkflowTitle}>Admin Workflow</Text>

                <Text style={styles.reviewWorkflowText}>

                  Approve this proposal to create a new project automatically. After approval, you will jump

                  straight to Projects for that new record.

                </Text>

              </View>



              <Text style={styles.previewTitle}>{proposalTitle}</Text>



              <View style={styles.previewGrid}>

                <View style={styles.previewGridItem}>

                  <Text style={styles.previewSectionLabel}>PARTNER ORGANIZATION</Text>

                  <Text style={styles.previewTextCompact}>{app.partnerName || 'Not provided'}</Text>

                </View>

                <View style={styles.previewGridItem}>

                  <Text style={styles.previewSectionLabel}>SUBMITTED ON</Text>

                  <Text style={styles.previewTextCompact}>{formatProposalDate(app.requestedAt)}</Text>

                </View>

              </View>



              <View style={styles.previewGrid}>

                <View style={styles.previewGridItem}>

                  <Text style={styles.previewSectionLabel}>TIMELINE</Text>

                  <Text style={styles.previewTextCompact}>

                    {formatProposalDate(proposalDetails.proposedStartDate)} to {formatProposalDate(proposalDetails.proposedEndDate)}

                  </Text>

                </View>

                <View style={styles.previewGridItem}>

                  <Text style={styles.previewSectionLabel}>LOCATION</Text>

                  <Text style={styles.previewTextCompact}>{proposalDetails.proposedLocation || 'Not provided'}</Text>

                </View>

              </View>





              <View style={styles.previewNarrativeCard}>

                <Text style={styles.previewSectionLabel}>PROJECT DESCRIPTION</Text>

                <Text style={styles.previewText}>{proposalDetails.proposedDescription || 'Not provided'}</Text>

              </View>



              <View style={styles.previewNarrativeCard}>

                <Text style={styles.previewSectionLabel}>ATTACHMENTS</Text>

                {proposalAttachments.length > 0 ? (

                  <View style={styles.attachmentList}>

                    {proposalAttachments.map((attachment: any, attachmentIndex: number) => {

                      const attachmentUri = String(attachment?.url || '').trim();

                      const isImageAttachment =

                        String(attachment?.type || '').trim() === 'image' || isImageMediaUri(attachmentUri);

                      if (!attachmentUri) {

                        return null;

                      }



                      return (

                        <View key={`${attachmentUri}-${attachmentIndex}`} style={styles.attachmentCard}>

                          {isImageAttachment ? (

                            <TouchableOpacity

                              onPress={() => void handleOpenProposalAttachment(attachmentUri, attachmentIndex)}

                              activeOpacity={0.85}

                            >

                              <Image source={{ uri: attachmentUri }} style={styles.attachmentPreviewImage} />

                            </TouchableOpacity>

                          ) : (

                            <View style={styles.attachmentPreviewFile}>

                              <MaterialIcons name="description" size={28} color="#166534" />

                            </View>

                          )}

                          <View style={styles.attachmentMeta}>

                            <Text style={styles.attachmentTitle}>{getAttachmentName(attachmentUri, attachmentIndex)}</Text>

                            <Text style={styles.attachmentSubtitle}>

                              {isImageAttachment ? 'Photo attachment' : 'Document attachment'}

                            </Text>

                            <TouchableOpacity

                              style={styles.attachmentDownloadButton}

                              onPress={() => void handleOpenProposalAttachment(attachmentUri, attachmentIndex)}

                              activeOpacity={0.85}

                            >

                              <MaterialIcons name={isImageAttachment ? "visibility" : "download"} size={18} color="#166534" />

                              <Text style={styles.attachmentDownloadButtonText}>

                                {isImageAttachment ? 'View Photo' : 'Open or Download File'}

                              </Text>

                            </TouchableOpacity>

                          </View>

                        </View>

                      );

                    })}

                  </View>

                ) : (

                  <Text style={styles.previewText}>No attachments uploaded.</Text>

                )}

              </View>



              {user?.role === 'admin' && (app.status === 'Pending' || app.status === 'Resubmitted') && (
                <View style={styles.adminActionRow}>
                  <TouchableOpacity style={[styles.actionBtn, styles.approveBtn]} onPress={() => handleReview(app, 'Approved')}>
                    <Text style={styles.actionBtnText}>Approve Proposal</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#fffbeb', borderColor: '#fed7aa', borderWidth: 1 }]}
                    onPress={() => {
                      Alert.prompt
                        ? Alert.prompt(
                            'Request Revision',
                            'Specify what changes the partner needs to make:',
                            [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Send Request',
                                onPress: (notes) => handleReview(app, 'Revision Requested', notes?.trim() || 'Please revise proposal details.'),
                              },
                            ],
                            'plain-text'
                          )
                        : handleRejectWithNotes(app);
                    }}
                  >
                    <Text style={[styles.actionBtnText, { color: '#d97706' }]}>Request Revision</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => handleRejectWithNotes(app)}>
                    <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>Reject</Text>
                  </TouchableOpacity>
                </View>
              )}

              {user?.role === 'partner' && (app.status === 'Revision Requested' || app.status === 'Needs Revision') && (
                <View style={{ marginTop: 16 }}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.approveBtn, { backgroundColor: '#d97706', width: '100%', justifyContent: 'center' }]}
                    onPress={() => handleEditProposalFromMessage(app)}
                  >
                    <MaterialIcons name="edit" size={16} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.actionBtnText}>Edit & Resubmit Proposal</Text>
                  </TouchableOpacity>
                </View>
              )}



              {user?.role === 'admin' && app.status === 'Approved' && (

                <View style={styles.adminActionRow}>

                  <TouchableOpacity

                    style={[styles.actionBtn, styles.approveBtn]}

                    onPress={() => navigateToAvailableRoute(navigation, 'Projects', { projectId: app.projectId })}

                  >

                    <Text style={styles.actionBtnText}>Open Project</Text>

                  </TouchableOpacity>

                </View>

              )}



              {app.status === 'Rejected' && app.reviewNotes ? (

                <View style={{ marginTop: 10, padding: 10, backgroundColor: '#fef2f2', borderRadius: 8, borderWidth: 1, borderColor: '#fecaca' }}>

                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#991b1b', marginBottom: 4 }}>Rejection Reason</Text>

                  <Text style={{ fontSize: 13, color: '#7f1d1d' }}>{app.reviewNotes}</Text>

                </View>

              ) : null}

            </View>

          </ScrollView>

        </View>

      );

    }



    if (!selectedUser && !selectedProjectChat) {

      return (

        <View style={styles.detailEmpty}>

          <View style={styles.emptyIconCircle}>

            <Ionicons name="chatbubbles-outline" size={64} color="#166534" />

          </View>

          <Text style={styles.emptyTitle}>Your Workspace Hub</Text>

          <Text style={styles.emptySubtitle}>

            {user?.role === 'admin'

              ? 'Open a partner proposal, contact, or Event GC to continue your admin workflow.'

              : user?.role === 'partner'

              ? 'Select an admin conversation to start collaborating.'

              : 'Select an admin conversation or Event GC to start collaborating.'}

          </Text>

        </View>

      );

    }



    const title = selectedUser?.name || selectedProjectChat?.project.title;

    const subtitle = selectedUser

      ? (selectedUser.role === 'admin' ? 'System Admin' : 'Direct Message')

      : 'Event GC';



    return (

      <View style={styles.detail}>

        <View style={[styles.detailHeader, !isWide && { paddingTop: insets.top, height: 70 + insets.top }]}>

          {!isWide && (

            <TouchableOpacity onPress={() => setView('sidebar')} style={styles.backButton}>

              <Ionicons name="arrow-back" size={24} color="#166534" />

            </TouchableOpacity>

          )}

          <View style={styles.headerInfo}>

            <View style={styles.headerAvatar}>

              <Text style={styles.headerAvatarText}>{title?.[0].toUpperCase()}</Text>

            </View>

            <View style={{ flex: 1, flexShrink: 1 }}>

              <Text style={styles.detailTitle} numberOfLines={1} ellipsizeMode="tail">{title}</Text>

              <Text style={styles.detailSubtitle} numberOfLines={1} ellipsizeMode="tail">{subtitle}</Text>

            </View>

          </View>

          <View style={styles.headerActions}>

            {isWide && (

              <TouchableOpacity

                style={styles.headerAction}

                onPress={closeActiveConversation}

                activeOpacity={0.8}

              >

                <MaterialIcons name="close" size={22} color="#64748b" />

              </TouchableOpacity>

            )}

            {selectedProjectChat ? (

              <View style={styles.conversationMenuWrap}>

                <TouchableOpacity

                  style={styles.headerAction}

                  onPress={() => setShowConversationMenu(current => !current)}

                  activeOpacity={0.8}

                >

                  <Ionicons name="ellipsis-vertical" size={22} color="#64748b" />

                </TouchableOpacity>

                {showConversationMenu ? (

                  <View style={styles.conversationMenu}>

                    <TouchableOpacity

                      style={styles.conversationMenuItem}

                      onPress={handleOpenGcMembers}

                      activeOpacity={0.85}

                    >

                      <MaterialIcons name="groups" size={18} color="#166534" />

                      <Text style={styles.conversationMenuText}>View Members</Text>

                    </TouchableOpacity>

                    <TouchableOpacity

                      style={styles.conversationMenuItem}

                      onPress={handleOpenGcProjectDetails}

                      activeOpacity={0.85}

                    >

                      <MaterialIcons name="open-in-new" size={18} color="#166534" />

                      <Text style={styles.conversationMenuText}>Open Event Details</Text>

                    </TouchableOpacity>

                    {user?.role === 'admin' ? (

                      <TouchableOpacity

                        style={[styles.conversationMenuItem, styles.conversationMenuItemDanger]}

                        onPress={handleDeleteEventGc}

                        activeOpacity={0.85}

                        disabled={conversationMenuAction === 'delete-gc'}

                      >

                        {conversationMenuAction === 'delete-gc' ? (

                          <ActivityIndicator size="small" color="#dc2626" />

                        ) : (

                          <MaterialIcons name="delete-forever" size={18} color="#dc2626" />

                        )}

                        <Text style={styles.conversationMenuDangerText}>Delete GC</Text>

                      </TouchableOpacity>

                    ) : null}

                    {user?.role === 'volunteer' ? (

                    <TouchableOpacity

                      style={[styles.conversationMenuItem, styles.conversationMenuItemDanger]}

                      onPress={handleLeaveEventGc}

                      activeOpacity={0.85}

                    >

                      <MaterialIcons name="logout" size={18} color="#dc2626" />

                      <Text style={styles.conversationMenuDangerText}>Leave GC</Text>

                    </TouchableOpacity>

                    ) : null}

                  </View>

                ) : null}

              </View>

            ) : null}

          </View>

        </View>



        <ScrollView
          ref={scrollRef}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesListContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
        >
          {isMessagesLoading && messages.length === 0 ? (
            <View style={{ paddingVertical: 40, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <ActivityIndicator size="small" color="#166534" />
              <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '600' }}>Loading conversation...</Text>
            </View>
          ) : null}

          {selectedUser && (user?.role === 'admin' || user?.role === 'partner') && (() => {

            const related = proposalChats.filter(item =>

              user?.role === 'admin'

                ? item.application.partnerUserId === selectedUser.id

                : selectedUser.role === 'admin' && item.application.partnerUserId === user?.id

            );

            if (!related.length) return null;

            return (

              <View style={styles.relatedProposalsSection}>

                <Text style={styles.relatedProposalsLabel}>Related Proposals</Text>

                {related.slice(0, 3).map(item => (

                  <ProposalCard

                    key={item.application.id}

                    application={item.application}

                    projectTitle={item.projectTitle}

                    compact

                  />

                ))}

              </View>

            );

          })()}

          {messages.length === 0 ? (

            <View style={styles.emptyChat}>

              <Text style={styles.emptyChatText}>Secure, end-to-end encrypted messaging.</Text>

            </View>

          ) : (

            (() => {

              const filteredMessages = messages;

              return filteredMessages.map((m, i) => {

              const isOwn = m.senderId === user?.id;

              const isProposal = typeof m.content === 'string' && m.content.startsWith(PROPOSAL_PREFIX);



              if (isProposal) {

                let application: any = {};

                try {

                  application = JSON.parse(m.content.replace(PROPOSAL_PREFIX, ''));

                } catch (e) { return null; }

                // Normalize proposalDetails for system data compatibility
                if (!application.proposalDetails && (application.proposedTitle || application.proposedDescription)) {
                  application.proposalDetails = {
                    proposedTitle: application.proposedTitle,
                    proposedDescription: application.proposedDescription,
                    proposedStartDate: application.proposedStartDate,
                    proposedEndDate: application.proposedEndDate,
                    proposedLocation: application.proposedLocation,
                    proposedVolunteersNeeded: application.proposedVolunteersNeeded,
                    communityNeed: application.communityNeed,
                    expectedDeliverables: application.expectedDeliverables,
                    requestedProgramModule: application.requestedProgramModule || application.programModule,
                    targetProjectId: application.targetProjectId || application.projectId,
                    attachments: application.attachments,
                    photoAttachment: application.photoAttachment,
                  };
                }
                const isAdminView = user?.role === 'admin';
                const isOwner = Boolean((application.proposedById && application.proposedById === user?.id) || (application.partnerUserId && application.partnerUserId === user?.id) || isOwn);
                const templateApp: PartnerProjectApplication = {
                  id: application.id || m.id,
                  projectId: application.projectId || application.targetProjectId || 'new',
                  partnerUserId: application.partnerUserId || application.proposedById || '',
                  partnerName: application.partnerName || application.proposedByName || user?.name || 'Partner',
                  partnerEmail: application.partnerEmail || '',
                  status: (application.status === 'Proposed' ? 'Pending' : application.status) as any || 'Pending',
                  requestedAt: application.timestamp || application.requestedAt || m.timestamp,
                  proposalDetails: application.proposalDetails || {},
                  reviewNotes: application.reviewNotes,
                } as any;

                return (

                  <View key={`proposal-${m.id}-${i}`} style={[styles.messageRow, isOwn ? styles.messageRowOwn : styles.messageRowOther, styles.proposalMessageRow]}>

                    <TouchableOpacity
                      onLongPress={() => isOwn && handleDeleteMessage(m.id, !!selectedProjectChat)}
                      activeOpacity={0.95}
                      delayLongPress={500}
                    >
                      <ProposalMessageTemplate
                        application={templateApp}
                        isAdmin={isAdminView}
                        isOwner={isOwner}
                        isSubmitting={isSubmittingInlineDraft}
                        onEdit={(app) => handleEditProposalFromMessage(app)}
                        onSubmit={(app) => handleSubmitProposalFromMessage(app)}
                        onViewProjects={(app) => {
                          navigateToAvailableRoute(
                            navigation,
                            'Projects',
                            { projectId: app.projectId, programSuiteView: 'projects' },
                            { routeName: 'Projects', params: { projectId: app.projectId, programSuiteView: 'projects' } }
                          );
                        }}
                        onOpenAttachment={(url) => {
                          void Linking.openURL(url).catch(() => Alert.alert('Attachment', 'Unable to open this attachment on this device.'));
                        }}
                      />
                    </TouchableOpacity>

                    <Text style={styles.messageTime}>

                      {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}

                    </Text>

                  </View>

                );

              }



              const isProposalNotification =
                typeof m.content === 'string' &&
                (m.content.startsWith('Your proposal for ') ||
                 m.content.includes('has been submitted and'));

              if (isProposalNotification) {
                const titleMatch = m.content.match(/Your proposal for (?:the )?["“]?([^"”]+)["”]?/i);
                const extractedTarget = titleMatch ? titleMatch[1].replace(/ program module/i, '').trim() : '';

                // Look up proposal in proposalChats / partner proposals
                const matchingChat = proposalChats.find(item => {
                  const pTitle = item.projectTitle || item.application?.proposalDetails?.proposedTitle || '';
                  const pModule = item.application?.proposalDetails?.requestedProgramModule || getProgramModuleFromProposalProjectId(item.application?.projectId) || '';
                  const normTarget = extractedTarget.toLowerCase();
                  return (
                    pTitle.toLowerCase().includes(normTarget) ||
                    normTarget.includes(pTitle.toLowerCase()) ||
                    pModule.toLowerCase() === normTarget ||
                    normTarget.includes(pModule.toLowerCase())
                  );
                });

                const appStatus = matchingChat?.application?.status;
                const isApproved = appStatus === 'Approved' || m.content.toLowerCase().includes('has been approved');
                const isRevisionRequested = appStatus === 'Revision Requested' || appStatus === 'Needs Revision' || m.content.toLowerCase().includes('requires revision');
                const isResubmitted = appStatus === 'Resubmitted' || m.content.toLowerCase().includes('has been resubmitted');
                const displayTitle = matchingChat?.projectTitle || extractedTarget || 'Program Proposal';
                const targetProjectId = matchingChat?.application?.projectId || 'all';

                const badgeBg = isApproved ? '#dcfce7' : isRevisionRequested ? '#fef3c7' : isResubmitted ? '#dbeafe' : '#fef3c7';
                const badgeColor = isApproved ? '#166534' : isRevisionRequested ? '#b45309' : isResubmitted ? '#1d4ed8' : '#b45309';
                const badgeText = isApproved ? 'APPROVED' : isRevisionRequested ? 'NEEDS REVISION' : isResubmitted ? 'RESUBMITTED' : 'PENDING REVIEW';
                const iconName = isApproved ? 'check-circle' : isRevisionRequested ? 'edit-note' : isResubmitted ? 'update' : 'schedule';

                return (
                  <View key={`proposal-notice-${m.id}-${i}`} style={[styles.messageRow, isOwn ? styles.messageRowOwn : styles.messageRowOther]}>
                    <View style={[styles.approvedNoticeContainer, isRevisionRequested && { borderColor: '#fed7aa' }, isResubmitted && { borderColor: '#bfdbfe' }]}>
                      <View style={styles.approvedNoticeHeader}>
                        <View style={[styles.approvedNoticeIconCircle, { backgroundColor: badgeBg }]}>
                          <MaterialIcons
                            name={iconName as any}
                            size={22}
                            color={badgeColor}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={[styles.approvedBadgePill, { backgroundColor: badgeBg }]}>
                            <Text style={[styles.approvedBadgeText, { color: badgeColor }]}>
                              {badgeText}
                            </Text>
                          </View>
                          <Text style={styles.approvedNoticeHeadline}>
                            {isApproved
                              ? `Your proposal for "${displayTitle}" has been submitted and has been approved`
                              : isRevisionRequested
                              ? `Revision Requested for "${displayTitle}". Please edit and resubmit.`
                              : isResubmitted
                              ? `Your revised proposal for "${displayTitle}" has been submitted and is pending admin review.`
                              : `Your proposal for "${displayTitle}" has been submitted and is pending admin review.`}
                          </Text>
                        </View>
                      </View>

                      {isApproved && (
                        <TouchableOpacity
                          style={styles.approvedNoticeButton}
                          onPress={() => {
                            navigateToAvailableRoute(
                              navigation,
                              'Projects',
                              { projectId: targetProjectId, programSuiteView: 'projects' },
                              { routeName: 'Projects', params: { projectId: targetProjectId, programSuiteView: 'projects' } }
                            );
                          }}
                          activeOpacity={0.85}
                        >
                          <MaterialIcons name="folder-special" size={18} color="#ffffff" style={{ marginRight: 6 }} />
                          <Text style={styles.approvedNoticeButtonText}>View my Projects</Text>
                          <MaterialIcons name="arrow-forward" size={16} color="#ffffff" style={{ marginLeft: 4 }} />
                        </TouchableOpacity>
                      )}

                      {isRevisionRequested && (
                        <TouchableOpacity
                          style={[styles.approvedNoticeButton, { backgroundColor: '#d97706' }]}
                          onPress={() => {
                            if (matchingChat?.application) {
                              handleEditProposalFromMessage(matchingChat.application);
                            }
                          }}
                          activeOpacity={0.85}
                        >
                          <MaterialIcons name="edit" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                          <Text style={styles.approvedNoticeButtonText}>Edit & Resubmit Proposal</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    <Text style={styles.messageTime}>
                      {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                );
              }

              const messageAttachments = m.attachments || [];

              return (
                <View key={`msg-${m.id}-${i}`} style={[styles.messageRow, isOwn ? styles.messageRowOwn : styles.messageRowOther]}>
                  <TouchableOpacity
                    style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}
                    onLongPress={() => isOwn && handleDeleteMessage(m.id, !!selectedProjectChat)}
                    activeOpacity={0.85}
                    delayLongPress={500}
                  >
                    {m.content ? (
                      <Text style={[styles.bubbleText, isOwn && styles.bubbleTextOwn]}>{m.content}</Text>
                    ) : null}

                    {messageAttachments.length > 0 ? (

                      <View style={styles.messageAttachmentList}>

                        {messageAttachments.map((attachmentUri, attachmentIndex) => {

                          const attachmentName = getAttachmentName(attachmentUri, attachmentIndex);

                          const isImageAttachment = isImageMediaUri(attachmentUri);



                          return (

                            <TouchableOpacity

                              key={`${m.id}-attachment-${attachmentIndex}`}

                              style={[

                                styles.messageAttachmentCard,

                                isOwn && styles.messageAttachmentCardOwn,

                              ]}

                              onPress={() => {

                                void Linking.openURL(attachmentUri).catch(() => {

                                  Alert.alert('Attachment', 'Unable to open this attachment on this device.');

                                });

                              }}

                              activeOpacity={0.85}

                            >

                              {isImageAttachment ? (

                                <Image source={{ uri: attachmentUri }} style={styles.messageAttachmentImage} />

                              ) : (

                                <View style={[styles.messageAttachmentFileIcon, isOwn && styles.messageAttachmentFileIconOwn]}>

                                  <MaterialIcons name="insert-drive-file" size={22} color={isOwn ? '#dcfce7' : '#166534'} />

                                </View>

                              )}

                              <Text

                                style={[

                                  styles.messageAttachmentName,

                                  isOwn && styles.messageAttachmentNameOwn,

                                ]}

                                numberOfLines={1}

                              >

                                {attachmentName}

                              </Text>

                            </TouchableOpacity>

                          );

                        })}

                      </View>

                    ) : null}

                  </TouchableOpacity>

                  <Text style={styles.messageTime}>

                    {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}

                  </Text>

                </View>

              );

              });

            })()

          )}

          {/* Typing Indicator */}
          {isRecipientTyping && selectedUser ? (
            <View style={[styles.messageRow, styles.messageRowOther, { marginTop: 4 }]}>
              <View style={[styles.bubble, styles.bubbleOther, { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 16, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#dcfce7' }]}>
                <ThreeDotsTypingIndicator />
                <Text style={{ fontSize: 12, color: '#166534', fontWeight: '500' }}>
                  {selectedUser.name || 'User'} is typing...
                </Text>
              </View>
            </View>
          ) : null}

          {/* Inline Draft Proposal Card – shown at bottom of messages list (partner or admin) */}
          {inlineDraftProposal && (isPartner || user?.role === 'admin') ? (() => {
            const draft = inlineDraftProposal;
            const getDocName = (uri: string) => {
              if (!uri) return '';
              const clean = uri.split('?')[0];
              const rawName = decodeURIComponent(clean.split('/').pop() || 'document');
              if (rawName.length <= 18) return rawName;
              const extIdx = rawName.lastIndexOf('.');
              if (extIdx > 0 && extIdx > rawName.length - 7) {
                const ext = rawName.slice(extIdx);
                const base = rawName.slice(0, extIdx);
                const leftLen = Math.max(5, 18 - ext.length - 3);
                return `${base.slice(0, leftLen)}...${ext}`;
              }
              return `${rawName.slice(0, 15)}...`;
            };
            return (
              <View style={inlineStyles.draftCardWrap}>
                <View style={inlineStyles.draftCard}>
                  {/* Header */}
                  <View style={inlineStyles.draftCardHeader}>
                    <View style={inlineStyles.draftCardIconWrap}>
                      <MaterialIcons name="description" size={22} color="#166534" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={inlineStyles.draftCardTitle}>Project Specifications</Text>
                      <Text style={inlineStyles.draftCardSub}>Provide details for the {inlineDraftModule} program.</Text>
                    </View>
                    <View style={inlineStyles.draftBadge}>
                      <Text style={inlineStyles.draftBadgeText}>DRAFT</Text>
                    </View>
                  </View>

                  <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false} nestedScrollEnabled>
                    <View style={inlineStyles.draftCardBody}>
                      {/* Program Selection Row */}
                      <View style={[inlineStyles.draftRow, { marginBottom: 10 }]}>
                        <View style={[inlineStyles.draftGroup, { flex: 1 }]}>
                          <Text style={inlineStyles.draftLabel}>Program Track / Advocacy</Text>
                          <View style={inlineStyles.draftPickerBorder}>
                            <Picker
                              selectedValue={inlineDraftModule}
                              onValueChange={(val) => {
                                setInlineDraftModule(val);
                                const matched = systemPrograms.find(p => p.module === val || p.id === val || p.title === val);
                                if (matched) {
                                  setInlineDraftProjectId(matched.id);
                                }
                                setInlineDraftProposal(p => p ? { ...p, requestedProgramModule: (matched?.module || val) as any } : p);
                              }}
                              style={inlineStyles.draftPicker}
                            >
                              {systemPrograms.length > 0 ? (
                                systemPrograms.map(prog => (
                                  <Picker.Item
                                    key={prog.id}
                                    label={`${prog.title} (${prog.module})`}
                                    value={prog.module}
                                  />
                                ))
                              ) : (
                                <>
                                  <Picker.Item label="Nutrition (Feeding & Food Production)" value="Nutrition" />
                                  <Picker.Item label="Education (Literacy & Scholarships)" value="Education" />
                                  <Picker.Item label="Livelihood (Skills & Empowerment)" value="Livelihood" />
                                  <Picker.Item label="Disaster (Emergency Response)" value="Disaster" />
                                </>
                              )}
                            </Picker>
                          </View>
                        </View>
                      </View>

                      {/* Row 1: Project Title + Start Date */}
                      {(() => {
                        const isDuplicateProposalTitle = Boolean(
                          draft.proposedTitle &&
                          draft.proposedTitle.trim().length >= 2 &&
                          (systemPrograms.some(p => p?.title && p.title.trim().toLowerCase() === draft.proposedTitle.trim().toLowerCase()) ||
                           proposalChats.some(p => p?.projectTitle && p.projectTitle.trim().toLowerCase() === draft.proposedTitle.trim().toLowerCase()))
                        );
                        return (
                          <View style={[inlineStyles.draftRow, !isWide && inlineStyles.draftRowMobile]}>
                            <View style={[inlineStyles.draftGroup, { flex: 1 }]}>
                              <Text style={inlineStyles.draftLabel}>Project Title</Text>
                              <TextInput
                                style={[
                                  inlineStyles.draftInput,
                                  isDuplicateProposalTitle && { borderColor: '#f59e0b', backgroundColor: '#fffbeb' }
                                ]}
                                value={draft.proposedTitle}
                                onChangeText={t => setInlineDraftProposal(p => p ? { ...p, proposedTitle: t } : p)}
                                placeholder="e.g. Nutrition Program – Mingo"
                                placeholderTextColor="#94a3b8"
                              />
                              {isDuplicateProposalTitle ? (
                                <View style={{
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  gap: 6,
                                  backgroundColor: '#fffbeb',
                                  borderWidth: 1,
                                  borderColor: '#fde68a',
                                  borderRadius: 6,
                                  paddingHorizontal: 8,
                                  paddingVertical: 4,
                                  marginTop: 4,
                                }}>
                                  <MaterialIcons name="warning-amber" size={14} color="#d97706" />
                                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#b45309', flex: 1 }}>
                                    Warning: A program, project, or proposal with this title already exists.
                                  </Text>
                                </View>
                              ) : null}
                            </View>
                            <View style={[inlineStyles.draftGroup, { flex: 1 }]}>
                              <Text style={inlineStyles.draftLabel}>Start Date</Text>
                              <TouchableOpacity
                                style={inlineStyles.draftDateBtn}
                                onPress={() => setInlineStartDatePicker(true)}
                              >
                                <MaterialIcons name="calendar-today" size={15} color="#475569" />
                                <Text style={[inlineStyles.draftDateText, !draft.proposedStartDate && { color: '#94a3b8' }]}>
                                  {draft.proposedStartDate ? formatProposalDate(draft.proposedStartDate) : 'Select date'}
                                </Text>
                              </TouchableOpacity>
                              {inlineStartDatePicker && (
                                <LazyDateTimePicker
                                  value={draft.proposedStartDate ? new Date(draft.proposedStartDate) : new Date()}
                                  mode="date"
                                  display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
                                  onChange={(_: any, date?: Date) => {
                                    setInlineStartDatePicker(false);
                                    if (date) setInlineDraftProposal(p => p ? { ...p, proposedStartDate: date.toISOString().split('T')[0] } : p);
                                  }}
                                />
                              )}
                            </View>
                          </View>
                        );
                      })()}

                      {/* Row 2: Detailed Description + End Date */}
                      <View style={[inlineStyles.draftRow, !isWide && inlineStyles.draftRowMobile]}>
                        <View style={[inlineStyles.draftGroup, { flex: 1 }]}>
                          <Text style={inlineStyles.draftLabel}>Detailed Description</Text>
                          <TextInput
                            style={[inlineStyles.draftInput, { height: 80, textAlignVertical: 'top' }]}
                            multiline
                            value={draft.proposedDescription}
                            onChangeText={t => setInlineDraftProposal(p => p ? { ...p, proposedDescription: t } : p)}
                            placeholder="Outline the goals, target beneficiaries, and scope..."
                            placeholderTextColor="#94a3b8"
                          />
                        </View>
                        <View style={[inlineStyles.draftGroup, { flex: 1 }]}>
                          <Text style={inlineStyles.draftLabel}>End Date</Text>
                          <TouchableOpacity
                            style={inlineStyles.draftDateBtn}
                            onPress={() => setInlineEndDatePicker(true)}
                          >
                            <MaterialIcons name="calendar-today" size={15} color="#475569" />
                            <Text style={[inlineStyles.draftDateText, !draft.proposedEndDate && { color: '#94a3b8' }]}>
                              {draft.proposedEndDate ? formatProposalDate(draft.proposedEndDate) : 'Select date'}
                            </Text>
                          </TouchableOpacity>
                          {inlineEndDatePicker && (
                            <LazyDateTimePicker
                              value={draft.proposedEndDate ? new Date(draft.proposedEndDate) : new Date()}
                              mode="date"
                              display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
                              onChange={(_: any, date?: Date) => {
                                setInlineEndDatePicker(false);
                                if (date) setInlineDraftProposal(p => p ? { ...p, proposedEndDate: date.toISOString().split('T')[0] } : p);
                              }}
                            />
                          )}
                        </View>
                      </View>

                      {/* Row 3: Target Location + City/Municipality */}
                      <View style={[inlineStyles.draftRow, !isWide && inlineStyles.draftRowMobile]}>
                        <View style={[inlineStyles.draftGroup, { flex: 1 }]}>
                          <Text style={inlineStyles.draftLabel}>Target Location</Text>
                          <View style={inlineStyles.draftPickerBorder}>
                            <Picker
                              selectedValue={inlineRegionCode}
                              onValueChange={(code) => {
                                setInlineRegionCode(code);
                                const region = PHRegions.find(r => r.code === code);
                                setInlineFilteredCities(getCitiesByRegion(code));
                                setInlineCityCode('');
                                setInlineDraftProposal(p => p ? { ...p, proposedLocation: region ? region.name : '' } : p);
                              }}
                              style={inlineStyles.draftPicker}
                            >
                              <Picker.Item label="Select Region" value="" color="#94a3b8" />
                              {PHRegions.map(r => <Picker.Item key={r.code} label={r.name} value={r.code} />)}
                            </Picker>
                          </View>
                        </View>
                        <View style={[inlineStyles.draftGroup, { flex: 1 }]}>
                          <Text style={inlineStyles.draftLabel}>City / Municipality</Text>
                          <View style={inlineStyles.draftPickerBorder}>
                            <Picker
                              selectedValue={inlineCityCode}
                              enabled={!!inlineRegionCode}
                              onValueChange={(code) => {
                                setInlineCityCode(code);
                                const city = inlineFilteredCities.find(c => c.code === code);
                                const region = PHRegions.find(r => r.code === inlineRegionCode);
                                const composed = composePhilippineAddress(region?.name || '', city?.name || '', '');
                                setInlineDraftProposal(p => p ? { ...p, proposedLocation: composed } : p);
                              }}
                              style={inlineStyles.draftPicker}
                            >
                              <Picker.Item label="Select City" value="" color="#94a3b8" />
                              {inlineFilteredCities.map(c => <Picker.Item key={c.code} label={c.name} value={c.code} />)}
                            </Picker>
                          </View>
                        </View>
                      </View>

                      {/* Row 4: Proposal Photo + Proposal Document */}
                      <View style={[inlineStyles.draftRow, !isWide && inlineStyles.draftRowMobile]}>
                        <View style={[inlineStyles.draftGroup, { flex: 1 }]}>
                          <Text style={inlineStyles.draftLabel}>Proposal Photo</Text>
                          {draft.photoAttachment ? (
                            <View style={inlineStyles.draftAttachCard}>
                              <Image source={{ uri: draft.photoAttachment }} style={inlineStyles.draftAttachThumb} />
                              <View style={inlineStyles.draftAttachMeta}>
                                <Text style={inlineStyles.draftAttachName} numberOfLines={1}>
                                  {getDocName(draft.photoAttachment)}
                                </Text>
                              </View>
                              <TouchableOpacity
                                style={inlineStyles.draftAttachDownload}
                                onPress={() => void handleOpenProposalAttachment(draft.photoAttachment!, 0)}
                              >
                                <MaterialIcons name="file-download" size={18} color="#475569" />
                              </TouchableOpacity>
                            </View>
                          ) : (
                            <TouchableOpacity style={inlineStyles.draftAttachBtn} onPress={handlePickInlineDraftPhoto}>
                              <MaterialIcons name="photo-camera" size={16} color="#475569" />
                              <Text style={inlineStyles.draftAttachBtnText}>Attach Photo</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                        <View style={[inlineStyles.draftGroup, { flex: 1 }]}>
                          <Text style={inlineStyles.draftLabel}>Proposal Document</Text>
                          {inlineDraftDocAttachment ? (
                            <View style={inlineStyles.draftAttachCard}>
                              <View style={inlineStyles.draftAttachDocIcon}>
                                <MaterialIcons name="picture-as-pdf" size={24} color="#dc2626" />
                              </View>
                              <View style={inlineStyles.draftAttachMeta}>
                                <Text style={inlineStyles.draftAttachName} numberOfLines={1}>
                                  {getDocName(inlineDraftDocAttachment)}
                                </Text>
                              </View>
                              <TouchableOpacity
                                style={inlineStyles.draftAttachDownload}
                                onPress={() => void handleOpenProposalAttachment(inlineDraftDocAttachment, 0)}
                              >
                                <MaterialIcons name="file-download" size={18} color="#475569" />
                              </TouchableOpacity>
                            </View>
                          ) : (
                            <TouchableOpacity style={inlineStyles.draftAttachBtn} onPress={handlePickInlineDraftDoc}>
                              <MaterialIcons name="attach-file" size={16} color="#475569" />
                              <Text style={inlineStyles.draftAttachBtnText}>Attach Document</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>

                    </View>
                  </ScrollView>

                  {/* Footer buttons: Edit | Submit Proposal */}
                  <View style={inlineStyles.draftFooter}>
                    <TouchableOpacity
                      style={inlineStyles.draftEditBtn}
                      onPress={() => setInlineDraftProposal(null)}
                    >
                      <Text style={inlineStyles.draftEditBtnText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[inlineStyles.draftSubmitBtn, isSubmittingInlineDraft && { opacity: 0.6 }]}
                      onPress={handleSubmitInlineProposal}
                      disabled={isSubmittingInlineDraft}
                    >
                      {isSubmittingInlineDraft ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <MaterialIcons name="send" size={16} color="#fff" />
                      )}
                      <Text style={inlineStyles.draftSubmitBtnText}>
                        {isSubmittingInlineDraft ? 'Submitting...' : 'Submit Proposal'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })() : null}

        </ScrollView>



        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

          {showAttachmentMenu ? (

            <View style={styles.attachmentMenu}>

              <TouchableOpacity

                style={styles.attachmentMenuButton}

                onPress={() => void handlePickAttachment('photo')}

                activeOpacity={0.85}

              >

                <View style={styles.attachmentMenuIcon}>

                  <Ionicons name="image-outline" size={20} color="#166534" />

                </View>

                <View style={styles.attachmentMenuTextWrap}>

                  <Text style={styles.attachmentMenuTitle}>Photo upload</Text>

                  <Text style={styles.attachmentMenuSubtitle}>Attach an image from this device</Text>

                </View>

              </TouchableOpacity>

              <TouchableOpacity

                style={styles.attachmentMenuButton}

                onPress={() => void handlePickAttachment('file')}

                activeOpacity={0.85}

              >

                <View style={styles.attachmentMenuIcon}>

                  <MaterialIcons name="attach-file" size={20} color="#166534" />

                </View>

                <View style={styles.attachmentMenuTextWrap}>

                  <Text style={styles.attachmentMenuTitle}>File upload</Text>

                  <Text style={styles.attachmentMenuSubtitle}>Attach a document or file</Text>

                </View>

              </TouchableOpacity>

            </View>

          ) : null}

          {showEmojiPicker ? (
            <View style={styles.emojiPicker}>
              {QUICK_EMOJIS.map(e => (
                <TouchableOpacity key={e} style={styles.emojiItem} onPress={() => setMessageText(prev => prev + e)} activeOpacity={0.7}>
                  <Text style={styles.emojiText}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          <View style={styles.composer}>

            <TouchableOpacity

              style={[styles.composerAdd, showAttachmentMenu && styles.composerAddActive]}

              onPress={() => setShowAttachmentMenu(current => !current)}

              activeOpacity={0.85}

            >

              <Ionicons name="add-circle" size={28} color="#166534" />

            </TouchableOpacity>

            <View style={styles.inputWrap}>

              <TextInput
                style={styles.composerInput}
                placeholder={(isPartner && selectedUser?.role === 'admin') || (user?.role === 'admin' && selectedUser) ? 'Type a message or use /plan to insert a tool...' : 'Type a message...'}
                value={messageText}
                onChangeText={(t) => {
                  setMessageText(t);
                  // Update typing status
                  if (user?.id && selectedUser?.id) {
                    void setTypingStatus(user.id, selectedUser.id, true);
                    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                    typingTimeoutRef.current = setTimeout(() => {
                      if (user?.id && selectedUser?.id) {
                        void setTypingStatus(user.id, selectedUser.id, false);
                      }
                    }, 2500);
                  }
                  // Detect /plan command typed in composer
                  if (t.trim() === '/plan' && ((isPartner && selectedUser?.role === 'admin') || (user?.role === 'admin' && selectedUser))) {
                    setMessageText('');
                    handleInsertProposalDraft();
                  }
                }}
                multiline
                blurOnSubmit={false}
                returnKeyType="send"
                onSubmitEditing={() => {
                  if (Platform.OS !== 'web') handleSendMessage();
                }}
                onKeyPress={({ nativeEvent }: any) => {
                  if (nativeEvent.key === 'Enter' && !nativeEvent.shiftKey) {
                    if (Platform.OS === 'web') {
                      nativeEvent.preventDefault?.();
                      if (messageText.trim() || pendingAttachments.length > 0) handleSendMessage();
                    }
                  }
                }}
                maxLength={1000}

              />

            </View>

            <TouchableOpacity
              style={[styles.emojiBtn, showEmojiPicker && styles.emojiBtnActive]}
              onPress={() => setShowEmojiPicker(v => !v)}
              activeOpacity={0.8}
            >
              <MaterialIcons name="sentiment-satisfied-alt" size={22} color={showEmojiPicker ? "#166534" : "#64748b"} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.emojiBtn}
              onPress={() => void handlePickAttachment('file')}
              activeOpacity={0.8}
            >
              <MaterialIcons name="attach-file" size={22} color="#64748b" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.emojiBtn}
              onPress={() => {
                Alert.alert('Voice Message', 'Voice recording feature is available on mobile devices.');
              }}
              activeOpacity={0.8}
            >
              <MaterialIcons name="mic-none" size={22} color="#64748b" />
            </TouchableOpacity>

            {/* /plan shortcut button for partners and admins */}
            {((isPartner && selectedUser?.role === 'admin') || (user?.role === 'admin' && selectedUser)) && !inlineDraftProposal ? (
              <TouchableOpacity
                style={inlineStyles.planBtn}
                onPress={handleInsertProposalDraft}
                activeOpacity={0.8}
              >
                <MaterialIcons name="assignment" size={16} color="#166534" />
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity

              style={[

                styles.sendBtn,

                (!messageText.trim() && pendingAttachments.length === 0) && styles.sendBtnDisabled,

              ]}

              onPress={handleSendMessage}

              disabled={(!messageText.trim() && pendingAttachments.length === 0) || isSending}

            >

              {isSending ? (

                <ActivityIndicator size="small" color="#fff" />

              ) : (

                <Ionicons name="send" size={20} color="#fff" />

              )}

            </TouchableOpacity>

          </View>

        </KeyboardAvoidingView>

      </View>

    );

  };



  const renderNavRail = () => (

    <View style={styles.navRail}>

      {availableSections.map(section => {

        const sectionMeta = getSidebarSectionMeta(section);

        const isActive = activeSection === section;

        const badgeCount = section === 'proposals' ? pendingProposalCount : 0;



        return (

          <TouchableOpacity

            key={section}

            style={[styles.railItem, isActive && styles.railItemActive]}

            onPress={() => setActiveSection(section)}

            activeOpacity={0.85}

          >

            <MaterialIcons

              name={sectionMeta.icon}

              size={24}

              color={isActive ? '#ffffff' : 'rgba(255,255,255,0.72)'}

            />

            {badgeCount > 0 ? (

              <View style={styles.railBadge}>

                <Text style={styles.railBadgeText}>{badgeCount}</Text>

              </View>

            ) : null}

          </TouchableOpacity>

        );

      })}

      <View style={{ flex: 1 }} />

      <TouchableOpacity

        style={[styles.railAvatar, { backgroundColor: '#fff' }]}

        onPress={() => navigation.navigate('Profile')}

      >

        <Text style={{ color: '#166534', fontWeight: '800' }}>{user?.name?.[0].toUpperCase()}</Text>

      </TouchableOpacity>

    </View>

  );



  return (

    <View style={styles.container}>

      {activeProposalCardData && (() => {
        const pd = activeProposalCardData;
        const proposalDetails = pd.proposalDetails || {};
        
        const matchedApp = proposalChats.find(
          item => item.application.id === pd.applicationId || item.application.id === pd.id
        )?.application || null;
        
        const extractedData = {
          proposedTitle: proposalDetails.proposedTitle || pd.proposedTitle || 'Project Proposal',
          proposedDescription: proposalDetails.proposedDescription || pd.proposedDescription,
          proposedStartDate: proposalDetails.proposedStartDate || pd.proposedStartDate,
          proposedEndDate: proposalDetails.proposedEndDate || pd.proposedEndDate,
          proposedLocation: proposalDetails.proposedLocation || pd.proposedLocation,
          proposedVolunteersNeeded: proposalDetails.proposedVolunteersNeeded ?? pd.proposedVolunteersNeeded,
          communityNeed: proposalDetails.communityNeed || pd.communityNeed,
          expectedDeliverables: proposalDetails.expectedDeliverables || pd.expectedDeliverables,
          skillsNeeded: proposalDetails.skillsNeeded || pd.skillsNeeded,
          programModule: proposalDetails.requestedProgramModule || pd.programModule || pd.requestedProgramModule,
        };
        
        const pdStatus: string = pd.status || matchedApp?.status || 'Pending';
        const pdApproved = pdStatus === 'Approved';
        const pdRejected = pdStatus === 'Rejected';
        const pdPending = pdStatus === 'Pending';
        const pdStatusColor = pdApproved ? '#166534' : pdRejected ? '#dc2626' : '#d97706';
        const pdStatusBg = pdApproved ? '#dcfce7' : pdRejected ? '#fee2e2' : '#fef9c3';
        
        const actualStatus = matchedApp?.status || pdStatus;
        const isActuallyPending = actualStatus === 'Pending';

        return (
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContainer, { maxWidth: 520, maxHeight: '85%' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10 }}>
                <View style={[styles.propCompactIconBox, { backgroundColor: pdStatusBg, width: 40, height: 40 }]}>
                  <MaterialIcons name="assignment" size={22} color={pdStatusColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#1e293b' }} numberOfLines={2}>
                    {extractedData.proposedTitle}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <View style={[{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99, backgroundColor: pdStatusBg }]}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: pdStatusColor }}>{pdStatus}</Text>
                    </View>
                    {extractedData.programModule ? (
                      <Text style={{ fontSize: 11, color: '#64748b' }}>{extractedData.programModule}</Text>
                    ) : null}
                  </View>
                </View>
                <TouchableOpacity onPress={() => setActiveProposalCardData(null)} style={{ padding: 4 }}>
                  <MaterialIcons name="close" size={22} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
                {extractedData.proposedDescription ? (
                  <View style={{ marginBottom: 12 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Description</Text>
                    <Text style={{ fontSize: 13, color: '#374151', lineHeight: 20 }}>{extractedData.proposedDescription}</Text>
                  </View>
                ) : null}

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                  {extractedData.proposedStartDate ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f8fafc', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
                      <MaterialIcons name="event" size={14} color="#64748b" />
                      <Text style={{ fontSize: 12, color: '#374151' }}>{extractedData.proposedStartDate}</Text>
                    </View>
                  ) : null}
                  {extractedData.proposedVolunteersNeeded ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f8fafc', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
                      <MaterialIcons name="people" size={14} color="#64748b" />
                      <Text style={{ fontSize: 12, color: '#374151' }}>{extractedData.proposedVolunteersNeeded} Volunteers</Text>
                    </View>
                  ) : null}
                  {extractedData.proposedLocation ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f8fafc', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
                      <MaterialIcons name="location-on" size={14} color="#64748b" />
                      <Text style={{ fontSize: 12, color: '#374151' }}>{extractedData.proposedLocation}</Text>
                    </View>
                  ) : null}
                </View>

                {Array.isArray(proposalDetails.attachments) && proposalDetails.attachments.length > 0 ? (
                  <View style={{ marginBottom: 12 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Attachments</Text>
                    <View style={styles.attachmentList}>
                      {proposalDetails.attachments.map((attachment: any, attachmentIndex: number) => {
                        const attachmentUri = String(attachment?.url || '').trim();
                        const isImageAttachment =
                          String(attachment?.type || '').trim() === 'image' || isImageMediaUri(attachmentUri);
                        if (!attachmentUri) {
                          return null;
                        }

                        return (
                          <View key={`${attachmentUri}-${attachmentIndex}`} style={styles.attachmentCard}>
                            {isImageAttachment ? (
                              <TouchableOpacity
                                onPress={() => void handleOpenProposalAttachment(attachmentUri, attachmentIndex)}
                                activeOpacity={0.85}
                              >
                                <Image source={{ uri: attachmentUri }} style={styles.attachmentPreviewImage} />
                              </TouchableOpacity>
                            ) : (
                              <View style={styles.attachmentPreviewFile}>
                                <MaterialIcons name="description" size={28} color="#166534" />
                              </View>
                            )}
                            <View style={styles.attachmentMeta}>
                              <Text style={styles.attachmentTitle}>{getAttachmentName(attachmentUri, attachmentIndex)}</Text>
                              <Text style={styles.attachmentSubtitle}>
                                {isImageAttachment ? 'Photo attachment' : 'Document attachment'}
                              </Text>
                              <TouchableOpacity
                                style={styles.attachmentDownloadButton}
                                onPress={() => void handleOpenProposalAttachment(attachmentUri, attachmentIndex)}
                                activeOpacity={0.85}
                              >
                                <MaterialIcons name="download" size={18} color="#166534" />
                                <Text style={styles.attachmentDownloadButtonText}>
                                  {isImageAttachment ? 'Open or Download Photo' : 'Open or Download File'}
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                ) : null}

                {pdRejected && pd.reviewNotes ? (
                  <View style={{ marginBottom: 12, padding: 10, backgroundColor: '#fef2f2', borderRadius: 8, borderWidth: 1, borderColor: '#fecaca' }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#991b1b', marginBottom: 4 }}>Rejection Reason</Text>
                    <Text style={{ fontSize: 13, color: '#7f1d1d', lineHeight: 18 }}>{pd.reviewNotes}</Text>
                  </View>
                ) : null}
              </ScrollView>

              {user?.role === 'admin' && isActuallyPending && matchedApp ? (
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { flex: 1, backgroundColor: '#f3f4f6' }]}
                    onPress={() => {
                      setActiveProposalCardData(null);
                      handleRejectWithNotes(matchedApp);
                    }}
                  >
                    <Text style={[styles.actionBtnText, { color: '#dc2626' }]}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.approveBtn, { flex: 2 }]}
                    onPress={() => {
                      setActiveProposalCardData(null);
                      void handleReview(matchedApp, 'Approved');
                    }}
                  >
                    <Text style={styles.actionBtnText}>Approve Proposal</Text>
                  </TouchableOpacity>
                </View>
              ) : user?.role === 'partner' && pdRejected ? (
                <TouchableOpacity
                  style={[styles.reviseBtn, { marginTop: 16, borderRadius: 16, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }]}
                  onPress={() => {
                    openProposalRevision(pd);
                  }}
                  activeOpacity={0.85}
                >
                  <MaterialIcons name="edit" size={20} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.2 }}>Revise & Resubmit</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#f3f4f6', marginTop: 14 }]}
                  onPress={() => setActiveProposalCardData(null)}
                >
                  <Text style={[styles.actionBtnText, { color: '#374151' }]}>Close</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        );
      })()}

      <Modal visible={isApproving} transparent={true} animationType="fade">
        <View style={styles.loadingModalOverlay}>
          <View style={styles.loadingModalContent}>
            <ActivityIndicator size="large" color="#166534" />
            <Text style={styles.loadingModalText}>Approving Proposal...</Text>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showRejectionModal}

        transparent

        animationType="fade"

        onRequestClose={() => setShowRejectionModal(false)}

      >

        <View style={styles.modalOverlay}>

          <View style={[styles.modalContainer, { maxWidth: 480 }]}>

            <Text style={[styles.modalTitle, { marginBottom: 8 }]}>Reject Proposal</Text>

            <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>

              Provide a reason so the partner can revise and resubmit.

            </Text>

            <TextInput

              style={[styles.input, { height: 100, textAlignVertical: 'top', marginBottom: 16 }]}

              placeholder="Rejection reason (required)"

              value={rejectionNotes}

              onChangeText={setRejectionNotes}

              multiline

              maxLength={500}

            />

            <View style={{ flexDirection: 'row', gap: 10 }}>

              <TouchableOpacity

                style={[styles.actionBtn, { flex: 1, backgroundColor: '#f3f4f6' }]}

                onPress={() => { setShowRejectionModal(false); setPendingRejectApp(null); }}

              >

                <Text style={[styles.actionBtnText, { color: '#374151' }]}>Cancel</Text>

              </TouchableOpacity>

              <TouchableOpacity

                style={[styles.actionBtn, styles.rejectBtn, { flex: 1, opacity: rejectionNotes.trim() ? 1 : 0.5 }]}

                disabled={!rejectionNotes.trim()}

                onPress={() => {

                  const app = pendingRejectApp;

                  const notes = rejectionNotes.trim();

                  setShowRejectionModal(false);

                  setPendingRejectApp(null);

                  void handleReview(app, 'Rejected', notes);

                }}

              >

                <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>Confirm Reject</Text>

              </TouchableOpacity>

            </View>

          </View>

        </View>

      </Modal>



      {reviewNotice ? (

        <View style={styles.reviewNoticeWrap}>

          <View

            style={[

              styles.reviewNoticeCard,

              reviewNotice.tone === 'warning' ? styles.reviewNoticeWarning : styles.reviewNoticeSuccess,

            ]}

          >

            <MaterialIcons

              name={reviewNotice.tone === 'warning' ? 'info' : 'check-circle'}

              size={18}

              color={reviewNotice.tone === 'warning' ? '#9a3412' : '#166534'}

            />

            <View style={styles.reviewNoticeTextWrap}>

              <Text

                style={[

                  styles.reviewNoticeTitle,

                  reviewNotice.tone === 'warning' ? styles.reviewNoticeTitleWarning : null,

                ]}

              >

                {reviewNotice.title}

              </Text>

              <Text

                style={[

                  styles.reviewNoticeMessage,

                  reviewNotice.tone === 'warning' ? styles.reviewNoticeMessageWarning : null,

                ]}

              >

                {reviewNotice.message}

              </Text>

            </View>

            {reviewNotice.projectId ? (
              <TouchableOpacity
                onPress={() => {
                  const pid = reviewNotice.projectId!;
                  setReviewNotice(null);
                  navigateToAvailableRoute(navigation, 'Projects', { projectId: pid, programSuiteView: 'projects' });
                }}
                style={{ backgroundColor: '#166534', borderRadius: 6, paddingVertical: 6, paddingHorizontal: 14, marginRight: 6 }}
              >
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Load</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity onPress={() => setReviewNotice(null)} style={styles.reviewNoticeClose}>

              <Ionicons

                name="close"

                size={18}

                color={reviewNotice.tone === 'warning' ? '#9a3412' : '#166534'}

              />

            </TouchableOpacity>

          </View>

        </View>

      ) : null}

      <Modal

        visible={showMembersModal}

        transparent

        animationType="fade"

        onRequestClose={() => setShowMembersModal(false)}

      >

        <View style={styles.membersModalBackdrop}>

          <View style={styles.membersModalCard}>

            <View style={styles.membersModalHeader}>

              <View>

                <Text style={styles.membersModalTitle}>GC Members</Text>

                <Text style={styles.membersModalSubtitle}>

                  {selectedProjectChat?.project.title || 'Event GC'}

                </Text>

              </View>

              {isDetailsAdmin && selectedProjectChat && (
                <TouchableOpacity
                  style={{
                    backgroundColor: '#dcfce7',
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 8,
                    marginBottom: 12
                  }}
                  onPress={() => {
                    if (!selectedProjectChat) return;
                    try {
                      const existingIds = selectedProjectChat?.members.map(m => m.id) || [];
                      setAvailableVolunteers((allUsers || []).filter(u => u.role === 'volunteer' && !existingIds.includes(u.id)));
                      setShowAddMemberModal(true);
                    } catch (e) {
                      console.error(e);
                    }
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#166534' }}>+ Add Volunteer</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity

                style={styles.membersModalClose}

                onPress={() => setShowMembersModal(false)} 

                activeOpacity={0.85}

              >

                <Ionicons name="close" size={20} color="#475569" />

              </TouchableOpacity>

            </View>



            <ScrollView style={styles.membersList} showsVerticalScrollIndicator>

              {(selectedProjectChat?.members || []).length > 0 ? (

                selectedProjectChat?.members.map(member => (

                  <View key={`${member.role}:${member.id}`} style={styles.memberItem}>

                    <View

                      style={[

                        styles.memberAvatar,

                        member.role === 'Admin'

                          ? styles.memberAvatarAdmin

                          : member.role === 'Partner'

                          ? styles.memberAvatarPartner

                          : styles.memberAvatarVolunteer,

                      ]}

                    >

                      <Text style={styles.memberAvatarText}>

                        {member.name.charAt(0).toUpperCase()}

                      </Text>

                    </View>

                    <View style={styles.memberInfo}>

                      <Text style={styles.memberName}>{member.name}</Text>

                      {member.detail ? (

                        <Text style={styles.memberDetail} numberOfLines={1}>

                          {member.detail}

                        </Text>

                      ) : null}

                    </View>

                    <View style={styles.memberRoleBadge}>

                      <Text style={styles.memberRoleText}>{member.role}</Text>

                    </View>

                  </View>

                ))

              ) : (

                <View style={styles.membersEmptyState}>

                  <MaterialIcons name="groups" size={28} color="#94a3b8" />

                  <Text style={styles.membersEmptyText}>No members found for this GC.</Text>

                </View>

              )}

            </ScrollView>

          </View>

        </View>

      </Modal>

      <Modal
        visible={showAddMemberModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddMemberModal(false)}
      >
        <View style={styles.membersModalBackdrop}>
          <View style={styles.membersModalCard}>
            <View style={styles.membersModalHeader}>
              <View>
                <Text style={styles.membersModalTitle}>Add Volunteer</Text>
                <Text style={styles.membersModalSubtitle}>Select a volunteer to add to GC</Text>
              </View>
              <TouchableOpacity
                style={styles.membersModalClose}
                onPress={() => setShowAddMemberModal(false)}
                activeOpacity={0.85}
              >
                <Ionicons name="close" size={20} color="#475569" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.membersList} showsVerticalScrollIndicator>
              {availableVolunteers.length > 0 ? (
                availableVolunteers.map(volunteer => (
                  <TouchableOpacity
                    key={volunteer.id}
                    style={[styles.memberItem, { justifyContent: 'space-between' }]}
                    onPress={async () => {
                      if (!selectedProjectChat) return;
                      try {
                        await joinProjectEvent(selectedProjectChat.project.id, volunteer.id);
                        setShowAddMemberModal(false);
                        void loadData();
                      } catch (err) {
                        console.error(err);
                      }
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={[styles.memberAvatar, styles.memberAvatarVolunteer]}>
                        <Text style={styles.memberAvatarInitial}>{volunteer.name?.[0]?.toUpperCase() || 'V'}</Text>
                      </View>
                      <View>
                        <Text style={styles.memberName}>{volunteer.name}</Text>
                        <Text style={styles.memberRole}>Volunteer</Text>
                      </View>
                    </View>
                    <MaterialIcons name="add-circle-outline" size={24} color="#166534" />
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.membersEmptyState}>
                  <Text style={styles.membersEmptyText}>No available volunteers.</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(previewImageUri)}

        transparent

        animationType="fade"

        onRequestClose={() => setPreviewImageUri(null)}

      >

        <View style={styles.imagePreviewBackdrop}>

          <View style={styles.imagePreviewCard}>

            <View style={styles.imagePreviewHeader}>

              <Text style={styles.imagePreviewTitle}>Preview Photo</Text>

              <TouchableOpacity onPress={() => setPreviewImageUri(null)} style={styles.imagePreviewClose}>

                <MaterialIcons name="close" size={20} color="#0f172a" />

              </TouchableOpacity>

            </View>

            <Image

              source={{ uri: previewImageUri || '' }}

              style={styles.imagePreviewImage}

              resizeMode="contain"

            />

          </View>

        </View>

      </Modal>

      <View style={styles.layout}>

        {isTablet && renderNavRail()}

        {renderSidebar()}

        {renderDetail()}

      </View>

    </View>

  );

}



const styles = StyleSheet.create({

  container: { flex: 1, backgroundColor: '#fff' },

  layout: { flex: 1, flexDirection: 'row' },

  hidden: { display: 'none' },

  reviewNoticeWrap: {

    paddingHorizontal: 16,

    paddingTop: 12,

    paddingBottom: 4,

  },

  reviewNoticeCard: {

    flexDirection: 'row',

    alignItems: 'flex-start',

    gap: 10,

    borderRadius: 14,

    borderWidth: 1,

    paddingHorizontal: 14,

    paddingVertical: 12,

  },

  reviewNoticeSuccess: {

    backgroundColor: '#dcfce7',

    borderColor: '#86efac',

  },

  reviewNoticeWarning: {

    backgroundColor: '#ffedd5',

    borderColor: '#fdba74',

  },

  reviewNoticeTextWrap: {

    flex: 1,

  },

  reviewNoticeTitle: {

    fontSize: 13,

    fontWeight: '800',

    color: '#166534',

  },

  reviewNoticeTitleWarning: {

    color: '#9a3412',

  },

  reviewNoticeMessage: {

    marginTop: 2,

    fontSize: 12,

    lineHeight: 18,

    color: '#166534',

  },

  reviewNoticeMessageWarning: {

    color: '#9a3412',

  },

  reviewNoticeClose: {

    padding: 2,

  },



  navRail: {

    width: 72,

    backgroundColor: '#166534',

    alignItems: 'center',

    paddingVertical: 24,

    gap: 16

  },

  railItem: {

    width: 52,

    height: 52,

    borderRadius: 18,

    alignItems: 'center',

    justifyContent: 'center',

    backgroundColor: 'rgba(255,255,255,0.12)',

    position: 'relative',

  },

  railItemActive: { backgroundColor: 'rgba(255,255,255,0.22)' },

  railBadge: {

    position: 'absolute',

    top: -4,

    right: -2,

    minWidth: 20,

    height: 20,

    borderRadius: 10,

    backgroundColor: '#f59e0b',

    alignItems: 'center',

    justifyContent: 'center',

    paddingHorizontal: 5,

  },

  railBadgeText: {

    color: '#ffffff',

    fontSize: 10,

    fontWeight: '900',

  },

  railAvatar: {

    width: 40,

    height: 40,

    borderRadius: 12,

    alignItems: 'center',

    justifyContent: 'center',

    marginBottom: 10

  },



  sidebar: {

    width: 340,

    backgroundColor: '#fff',

    borderRightWidth: 1,

    borderRightColor: '#f1f5f9'

  },

  sidebarHeader: {

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',

    padding: 12,

    paddingBottom: 8

  },

  sidebarHeaderTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a', letterSpacing: -0.5 },

  sidebarHeaderAction: {

    width: 30,

    height: 30,

    borderRadius: 8,

    backgroundColor: '#f0fdf4',

    alignItems: 'center',

    justifyContent: 'center'

  },



  searchBox: {

    flexDirection: 'row',

    alignItems: 'center',

    gap: 8,

    marginHorizontal: 12,

    paddingHorizontal: 10,

    paddingVertical: 6,

    backgroundColor: '#f8fafc',

    borderRadius: 10,

    marginBottom: 10

  },

  searchInput: { flex: 1, fontSize: 13, color: '#1e293b' },



  notificationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 14,
    padding: 12,
    marginHorizontal: 12,
    marginBottom: 12,
    gap: 10,
    shadowColor: '#166534',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  notificationBannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBannerTextWrap: {
    flex: 1,
  },
  notificationBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#166534',
  },
  notificationBannerSubtitle: {
    fontSize: 11,
    color: '#475569',
    marginTop: 1,
  },
  notificationBannerAction: {
    fontSize: 12,
    fontWeight: '800',
    color: '#166534',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#dcfce7',
    borderRadius: 6,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 12,
  },
  emptyStateIllustration: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 240,
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#166534',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 8,
    shadowColor: '#166534',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyStateButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },

  sectionTabs: {
    paddingHorizontal: 12,
    marginBottom: 4,
    maxHeight: 44,
  },
  sectionTabsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  sectionTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionTabActive: {
    backgroundColor: '#166534',
    borderColor: '#166534',
  },
  sectionTabIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTabIconWrapActive: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  sectionTabText: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  sectionTabTextActive: { color: '#fff' },
  sectionTabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  sectionTabBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  sectionTabBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#166534',
  },
  sectionTabBadgeTextActive: {
    color: '#ffffff',
  },

  sidebarList: {
    flex: 1,
  },
  sidebarListContent: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    paddingTop: 2,
    paddingBottom: 24,
  },
  listSectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    paddingHorizontal: 12,
    marginTop: 6,
    marginBottom: 4,
  },

  sidebarItem: {

    flexDirection: 'row',

    alignItems: 'center',

    gap: 10,

    padding: 8,

    marginHorizontal: 6,

    borderRadius: 10,

    marginBottom: 4

  },

  sidebarItemActive: { backgroundColor: '#f0fdf4' },

  sidebarAvatar: {

    width: 32,

    height: 32,

    borderRadius: 10,

    alignItems: 'center',

    justifyContent: 'center'

  },

  sidebarAvatarText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  sidebarItemInfo: { flex: 1 },

  sidebarItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  sidebarItemTitle: { fontSize: 13, fontWeight: '800', color: '#1e293b' },

  sidebarItemTitleActive: { color: '#166534' },

  sidebarItemSubtitle: { fontSize: 11, color: '#64748b', marginTop: 1 },

  sidebarItemSubtitleActive: { color: '#166534', opacity: 0.8 },

  sidebarBadge: { backgroundColor: '#166534', borderRadius: 8, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },

  sidebarBadgeText: { color: '#fff', fontSize: 9, fontWeight: '900' },

  emptyListText: { textAlign: 'center', color: '#94a3b8', fontSize: 11, marginTop: 12 },



  detail: { flex: 1, backgroundColor: '#fff' },

  detailHeader: {

    height: 70,

    flexDirection: 'row',

    alignItems: 'center',

    paddingHorizontal: 18,

    borderBottomWidth: 1,

    borderBottomColor: '#f1f5f9',

    overflow: 'visible',

    zIndex: 50,

    elevation: 12,

  },

  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },

  headerAvatar: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#166534', alignItems: 'center', justifyContent: 'center' },

  headerAvatarText: { color: '#fff', fontWeight: '800', fontSize: 16 },

  detailTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a' },

  detailSubtitle: { fontSize: 13, color: '#166534', fontWeight: '600', marginTop: 1 },

  headerActions: { flexDirection: 'row', gap: 4, zIndex: 60 },

  headerAction: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  conversationMenuWrap: { position: 'relative', zIndex: 70 },

  conversationMenu: {

    position: 'absolute',

    right: 0,

    top: 44,

    minWidth: 190,

    backgroundColor: '#ffffff',

    borderRadius: 16,

    padding: 8,

    borderWidth: 1,

    borderColor: '#e2e8f0',

    shadowColor: '#0f172a',

    shadowOffset: { width: 0, height: 8 },

    shadowOpacity: 0.12,

    shadowRadius: 18,

    elevation: 8,

    zIndex: 80,

  },

  conversationMenuItem: {

    flexDirection: 'row',

    alignItems: 'center',

    gap: 8,

    paddingHorizontal: 10,

    paddingVertical: 10,

    borderRadius: 12,

    backgroundColor: '#f8fafc',

  },

  conversationMenuItemDanger: {

    backgroundColor: '#fef2f2',

  },

  conversationMenuText: { fontSize: 12, fontWeight: '800', color: '#166534' },

  conversationMenuDangerText: { fontSize: 12, fontWeight: '900', color: '#dc2626' },

  backButton: { marginRight: 16 },



  membersModalBackdrop: {

    flex: 1,

    backgroundColor: 'rgba(15,23,42,0.48)',

    alignItems: 'center',

    justifyContent: 'center',

    padding: 18,

  },

  membersModalCard: {

    width: '100%',

    maxWidth: 520,

    maxHeight: '82%',

    backgroundColor: '#ffffff',

    borderRadius: 22,

    borderWidth: 1,

    borderColor: '#e2e8f0',

    overflow: 'hidden',

    shadowColor: '#0f172a',

    shadowOffset: { width: 0, height: 16 },

    shadowOpacity: 0.18,

    shadowRadius: 28,

    elevation: 14,

  },

  membersModalHeader: {

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',

    gap: 12,

    paddingHorizontal: 18,

    paddingVertical: 16,

    borderBottomWidth: 1,

    borderBottomColor: '#e2e8f0',

    backgroundColor: '#f8fafc',

  },

  membersModalTitle: {

    fontSize: 16,

    fontWeight: '900',

    color: '#0f172a',

  },

  membersModalSubtitle: {

    marginTop: 2,

    fontSize: 12,

    fontWeight: '700',

    color: '#166534',

  },

  membersModalClose: {

    width: 34,

    height: 34,

    borderRadius: 12,

    backgroundColor: '#ffffff',

    alignItems: 'center',

    justifyContent: 'center',

    borderWidth: 1,

    borderColor: '#e2e8f0',

  },

  membersList: {

    padding: 12,

  },

  memberItem: {

    flexDirection: 'row',

    alignItems: 'center',

    gap: 10,

    padding: 10,

    borderRadius: 16,

    borderWidth: 1,

    borderColor: '#eef2f7',

    backgroundColor: '#ffffff',

    marginBottom: 8,

  },

  memberAvatar: {

    width: 38,

    height: 38,

    borderRadius: 14,

    alignItems: 'center',

    justifyContent: 'center',

  },

  memberAvatarAdmin: {

    backgroundColor: '#166534',

  },

  memberAvatarPartner: {

    backgroundColor: '#0369a1',

  },

  memberAvatarVolunteer: {

    backgroundColor: '#b45309',

  },

  memberAvatarText: {

    fontSize: 14,

    fontWeight: '900',

    color: '#ffffff',

  },

  memberInfo: {

    flex: 1,

    minWidth: 0,

  },

  memberName: {

    fontSize: 13,

    fontWeight: '900',

    color: '#0f172a',

  },

  memberDetail: {

    marginTop: 2,

    fontSize: 11,

    fontWeight: '600',

    color: '#64748b',

  },

  memberRoleBadge: {

    paddingHorizontal: 8,

    paddingVertical: 5,

    borderRadius: 999,

    backgroundColor: '#f0fdf4',

    borderWidth: 1,

    borderColor: '#bbf7d0',

  },

  memberRoleText: {

    fontSize: 10,

    fontWeight: '900',

    color: '#166534',

  },

  membersEmptyState: {

    alignItems: 'center',

    justifyContent: 'center',

    paddingVertical: 36,

    gap: 8,

  },

  membersEmptyText: {

    fontSize: 12,

    fontWeight: '700',

    color: '#64748b',

    textAlign: 'center',

  },

  

  imagePreviewBackdrop: {

    flex: 1,

    backgroundColor: 'rgba(15, 23, 42, 0.7)',

    justifyContent: 'center',

    alignItems: 'center',

    padding: 20,

  },

  imagePreviewCard: {

    width: '100%',

    maxWidth: 720,

    backgroundColor: '#fff',

    borderRadius: 20,

    overflow: 'hidden',

  },

  imagePreviewHeader: {

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',

    padding: 16,

    borderBottomWidth: 1,

    borderBottomColor: '#e2e8f0',

  },

  imagePreviewTitle: {

    fontSize: 16,

    fontWeight: '800',

    color: '#0f172a',

  },

  imagePreviewClose: {

    padding: 8,

  },

  imagePreviewImage: {

    width: '100%',

    height: 420,

    backgroundColor: '#f8fafc',

  },



  messagesList: { flex: 1 },

  messagesListContent: { padding: 10, gap: 8 },

  messageRow: { maxWidth: '85%', gap: 4 },

  proposalMessageRow: { maxWidth: '100%', width: '100%', alignSelf: 'stretch' },

  messageRowOwn: { alignSelf: 'flex-end', alignItems: 'flex-end' },

  messageRowOther: { alignSelf: 'flex-start' },

  bubble: { padding: 8, borderRadius: 12 },

  bubbleOwn: { backgroundColor: '#166534', borderBottomRightRadius: 3 },

  bubbleOther: { backgroundColor: '#f1f5f9', borderBottomLeftRadius: 3 },

  bubbleText: { fontSize: 12, lineHeight: 16, color: '#334155' },

  bubbleTextOwn: { color: '#fff' },

  messageAttachmentList: { gap: 6, marginTop: 8 },

  messageAttachmentCard: {

    minWidth: 160,

    maxWidth: 240,

    borderRadius: 12,

    backgroundColor: '#ffffff',

    borderWidth: 1,

    borderColor: '#e2e8f0',

    overflow: 'hidden',

  },

  messageAttachmentCardOwn: {

    backgroundColor: 'rgba(255,255,255,0.12)',

    borderColor: 'rgba(255,255,255,0.2)',

  },

  messageAttachmentImage: {

    width: 200,

    height: 120,

    backgroundColor: '#e2e8f0',

  },

  messageAttachmentFileIcon: {

    width: 200,

    height: 72,

    alignItems: 'center',

    justifyContent: 'center',

    backgroundColor: '#dcfce7',

  },

  messageAttachmentFileIconOwn: {

    backgroundColor: 'rgba(255,255,255,0.14)',

  },

  messageAttachmentName: {

    paddingHorizontal: 8,

    paddingVertical: 6,

    fontSize: 10,

    fontWeight: '800',

    color: '#334155',

  },

  messageAttachmentNameOwn: { color: '#ffffff' },

  messageTime: { fontSize: 9, color: '#94a3b8', fontWeight: '600' },

  emptyChat: { padding: 20, alignItems: 'center' },

  emptyChatText: { color: '#94a3b8', fontSize: 11 },



  attachmentMenu: {

    flexDirection: 'row',

    gap: 8,

    paddingHorizontal: 12,

    paddingTop: 8,

    paddingBottom: 4,

    borderTopWidth: 1,

    borderTopColor: '#f1f5f9',

    backgroundColor: '#ffffff',

  },

  attachmentMenuButton: {

    flex: 1,

    flexDirection: 'row',

    alignItems: 'center',

    gap: 6,

    padding: 8,

    borderRadius: 10,

    backgroundColor: '#f0fdf4',

    borderWidth: 1,

    borderColor: '#bbf7d0',

  },

  attachmentMenuIcon: {

    width: 28,

    height: 28,

    borderRadius: 8,

    backgroundColor: '#ffffff',

    alignItems: 'center',

    justifyContent: 'center',

  },

  attachmentMenuTextWrap: { flex: 1 },

  attachmentMenuTitle: { fontSize: 11, fontWeight: '900', color: '#14532d' },

  attachmentMenuSubtitle: { fontSize: 10, fontWeight: '600', color: '#64748b', marginTop: 1 },

  pendingAttachmentTray: {

    flexDirection: 'row',

    flexWrap: 'wrap',

    gap: 6,

    paddingHorizontal: 12,

    paddingTop: 8,

    backgroundColor: '#ffffff',

  },

  pendingAttachmentChip: {

    maxWidth: 240,

    flexDirection: 'row',

    alignItems: 'center',

    gap: 6,

    paddingHorizontal: 8,

    paddingVertical: 5,

    borderRadius: 999,

    backgroundColor: '#f0fdf4',

    borderWidth: 1,

    borderColor: '#bbf7d0',

  },

  pendingAttachmentText: {

    flexShrink: 1,

    fontSize: 10,

    fontWeight: '800',

    color: '#166534',

  },

  composer: {

    flexDirection: 'row',

    alignItems: 'center',

    gap: 8,

    padding: 10,

    paddingTop: 8,

    borderTopWidth: 1,

    borderTopColor: '#f1f5f9'

  },

  composerAdd: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },

  composerAddActive: { backgroundColor: '#dcfce7', borderRadius: 16 },

  inputWrap: { flex: 1, backgroundColor: '#f1f5f9', borderRadius: 14, paddingHorizontal: 10 },

  composerInput: { minHeight: 32, maxHeight: 80, fontSize: 13, color: '#1e293b', paddingVertical: 6 },

  sendBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#166534', alignItems: 'center', justifyContent: 'center' },

  sendBtnDisabled: { opacity: 0.5 },



  detailEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },

  emptyIconCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },

  emptyTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a', marginBottom: 8 },

  emptySubtitle: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 22 },



  detailScrollContent: { padding: 18 },

  proposalCard: {

    backgroundColor: '#fff',

    borderRadius: 24,

    padding: 20,

    borderWidth: 1,

    borderColor: '#e2e8f0',

    shadowColor: '#000',

    shadowOffset: { width: 0, height: 8 },

    shadowOpacity: 0.05,

    shadowRadius: 20,

    elevation: 5

  },

  proposalHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },

  proposalTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a' },

  proposalMeta: { fontSize: 12, color: '#64748b', marginTop: 4 },

  formGroup: { marginBottom: 16 },

  formLabel: { fontSize: 12, fontWeight: '800', color: '#475569', marginBottom: 6, marginLeft: 4 },

  formInput: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, padding: 13, fontSize: 14, color: '#0f172a' },

  photoUploadButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#166534', paddingVertical: 12, borderRadius: 14, paddingHorizontal: 14, marginTop: 6 },

  photoUploadButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  photoPreviewContainer: { marginTop: 10, alignItems: 'center', gap: 8 },

  photoPreview: { width: '100%', height: 180, borderRadius: 14, backgroundColor: '#f1f5f9' },

  photoRemoveButton: { marginTop: 8, alignSelf: 'flex-end', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },

  photoRemoveButtonText: { color: '#334155', fontSize: 13, fontWeight: '700' },

  formRow: { flexDirection: 'row', gap: 12 },

  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#166534', paddingVertical: 15, borderRadius: 16, marginTop: 10 },

  submitBtnText: { color: '#fff', fontSize: 14, fontWeight: '900' },



  statusBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, marginBottom: 24 },

  statusText: { fontSize: 13, fontWeight: '700' },

  reviewWorkflowCard: {

    backgroundColor: '#eff6ff',

    borderWidth: 1,

    borderColor: '#bfdbfe',

    borderRadius: 16,

    padding: 14,

    marginBottom: 24,

  },

  reviewWorkflowTitle: {

    fontSize: 13,

    fontWeight: '900',

    color: '#1d4ed8',

    textTransform: 'uppercase',

    letterSpacing: 0.6,

  },

  reviewWorkflowText: {

    marginTop: 6,

    fontSize: 12,

    lineHeight: 18,

    color: '#334155',

  },

  previewTitle: { fontSize: 22, fontWeight: '900', color: '#0f172a', marginBottom: 24 },

  previewSectionLabel: { fontSize: 12, fontWeight: '900', color: '#94a3b8', letterSpacing: 1.5, marginBottom: 8 },

  previewText: { fontSize: 14, lineHeight: 22, color: '#334155', marginBottom: 20 },

  previewTextCompact: { fontSize: 14, lineHeight: 21, color: '#334155', marginBottom: 14 },

  previewGrid: { flexDirection: 'row', gap: 24, marginBottom: 24 },

  previewGridItem: { flex: 1 },

  previewNarrativeCard: {

    backgroundColor: '#f8fafc',

    borderWidth: 1,

    borderColor: '#e2e8f0',

    borderRadius: 16,

    padding: 14,

    marginBottom: 16,

  },

  previewSkillRow: {

    flexDirection: 'row',

    flexWrap: 'wrap',

    gap: 8,

  },

  previewSkillChip: {

    paddingHorizontal: 10,

    paddingVertical: 7,

    borderRadius: 999,

    backgroundColor: '#dcfce7',

    borderWidth: 1,

    borderColor: '#86efac',

  },

  previewSkillChipText: {

    fontSize: 11,

    fontWeight: '800',

    color: '#166534',

  },

  attachmentList: {

    gap: 12,

  },

  attachmentCard: {

    borderWidth: 1,

    borderColor: '#dbe2ea',

    borderRadius: 16,

    overflow: 'hidden',

    backgroundColor: '#ffffff',

  },

  attachmentPreviewImage: {

    width: '100%',

    height: 120,

    backgroundColor: '#e2e8f0',

  },

  attachmentPreviewFile: {

    width: '100%',

    height: 98,

    backgroundColor: '#f0fdf4',

    alignItems: 'center',

    justifyContent: 'center',

    borderBottomWidth: 1,

    borderBottomColor: '#dbe2ea',

  },

  attachmentMeta: {

    padding: 12,

    gap: 6,

  },

  attachmentTitle: {

    fontSize: 13,

    fontWeight: '800',

    color: '#0f172a',

  },

  attachmentSubtitle: {

    fontSize: 12,

    color: '#64748b',

    marginBottom: 8,

  },

  attachmentDownloadButton: {

    alignSelf: 'flex-start',

    flexDirection: 'row',

    alignItems: 'center',

    gap: 8,

    paddingHorizontal: 12,

    paddingVertical: 9,

    borderRadius: 10,

    backgroundColor: '#f0fdf4',

    borderWidth: 1,

    borderColor: '#86efac',

  },

  attachmentDownloadButtonText: {

    fontSize: 12,

    fontWeight: '800',

    color: '#166534',

  },

  adminActionRow: { flexDirection: 'row', gap: 16, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 32 },

  actionBtn: { flex: 1, paddingVertical: 18, borderRadius: 16, alignItems: 'center' },

  actionBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  reviseBtnText: { color: '#ffffff' },

  approveBtn: { backgroundColor: '#166534' },

  reviseBtn: { backgroundColor: '#047857', borderWidth: 1, borderColor: '#0f766e' },

  rejectBtn: { backgroundColor: '#fee2e2' },



  pickerTrigger: {

    backgroundColor: '#f8fafc',

    borderWidth: 1,

    borderColor: '#e2e8f0',

    borderRadius: 16,

    padding: 16,

    flexDirection: 'row',

    alignItems: 'center',

    gap: 10,

  },

  pickerTriggerText: { fontSize: 16, color: '#0f172a', fontWeight: '500' },

  pickerPlaceholder: { color: '#94a3b8' },



  addressContainer: { gap: 12 },

  pickerWrap: { flex: 1 },

  pickerLabel: { fontSize: 12, fontWeight: '700', color: '#64748b', marginBottom: 4, marginLeft: 4 },

  pickerBorder: {

    backgroundColor: '#f8fafc',

    borderWidth: 1,

    borderColor: '#e2e8f0',

    borderRadius: 16,

    overflow: 'hidden',

  },

  picker: { height: 50, width: '100%' },



  // ΓöÇΓöÇ Message Hub Template Panel ΓöÇΓöÇ

  msgHubOuter: {

    borderTopWidth: 1,

    borderTopColor: '#f1f5f9',

    backgroundColor: '#fff',

  },

  msgHubToggle: {

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',

    paddingHorizontal: 20,

    paddingVertical: 14,

  },

  msgHubToggleLeft: {

    flexDirection: 'row',

    alignItems: 'center',

    gap: 12,

  },

  msgHubPIcon: {

    width: 36,

    height: 36,

    borderRadius: 10,

    backgroundColor: '#fef3c7',

    alignItems: 'center',

    justifyContent: 'center',

  },

  msgHubPIconText: {

    fontSize: 18,

    fontWeight: '900',

    color: '#d97706',

  },

  msgHubToggleTitle: {

    fontSize: 16,

    fontWeight: '800',

    color: '#1e293b',

  },

  msgHubPanel: {

    paddingHorizontal: 20,

    paddingBottom: 16,

    gap: 14,

  },

  msgHubTabs: {

    flexDirection: 'row',

    gap: 0,

    borderBottomWidth: 2,

    borderBottomColor: '#f1f5f9',

  },

  msgHubTab: {

    flexDirection: 'row',

    alignItems: 'center',

    gap: 8,

    paddingVertical: 12,

    paddingHorizontal: 16,

    borderBottomWidth: 2,

    borderBottomColor: 'transparent',

    marginBottom: -2,

  },

  msgHubTabActive: {

    borderBottomColor: '#d97706',

  },

  msgHubTabText: {

    fontSize: 14,

    fontWeight: '600',

    color: '#94a3b8',

  },

  msgHubTabTextActive: {

    color: '#d97706',

    fontWeight: '700',

  },

  msgHubField: {

    gap: 6,

  },

  msgHubFieldLabel: {

    fontSize: 14,

    fontWeight: '700',

    color: '#1e293b',

  },

  msgHubSubjectInput: {

    backgroundColor: '#fff',

    borderWidth: 1,

    borderColor: '#e2e8f0',

    borderRadius: 10,

    paddingHorizontal: 14,

    paddingVertical: 12,

    fontSize: 14,

    color: '#1e293b',

  },

  msgHubToolbar: {

    flexDirection: 'row',

    alignItems: 'center',

    gap: 4,

    paddingVertical: 10,

    paddingHorizontal: 12,

    borderWidth: 1,

    borderColor: '#e2e8f0',

    borderTopLeftRadius: 10,

    borderTopRightRadius: 10,

    backgroundColor: '#fafafa',

    flexWrap: 'wrap',

  },

  msgHubToolBtn: {

    width: 34,

    height: 34,

    borderRadius: 6,

    alignItems: 'center',

    justifyContent: 'center',

  },

  msgHubToolDivider: {

    width: 1,

    height: 22,

    backgroundColor: '#e2e8f0',

    marginHorizontal: 4,

  },

  msgHubColorSwatch: {

    width: 18,

    height: 18,

    borderRadius: 4,

    backgroundColor: '#0f172a',

    borderWidth: 1,

    borderColor: '#cbd5e1',

  },

  msgHubBodyInput: {

    backgroundColor: '#fff',

    borderWidth: 1,

    borderColor: '#e2e8f0',

    borderTopWidth: 0,

    borderBottomLeftRadius: 10,

    borderBottomRightRadius: 10,

    paddingHorizontal: 14,

    paddingVertical: 14,

    fontSize: 14,

    color: '#1e293b',

    minHeight: 120,

    lineHeight: 22,

  },

  msgHubFooter: {

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',

    gap: 12,

    flexWrap: 'wrap',

  },

  msgHubToggleRow: {

    flexDirection: 'row',

    alignItems: 'center',

    gap: 16,

    flex: 1,

  },

  msgHubToggleLabel: {

    fontSize: 14,

    fontWeight: '700',

    color: '#1e293b',

  },

  msgHubToggleSub: {

    fontSize: 12,

    color: '#94a3b8',

    marginTop: 2,

  },

  msgHubSwitch: {

    width: 72,

    height: 36,

    borderRadius: 18,

    backgroundColor: '#e2e8f0',

    flexDirection: 'row',

    alignItems: 'center',

    paddingHorizontal: 4,

  },

  msgHubSwitchOn: {

    backgroundColor: '#d97706',

  },

  msgHubSwitchThumb: {

    width: 28,

    height: 28,

    borderRadius: 14,

    backgroundColor: '#fff',

    shadowColor: '#000',

    shadowOffset: { width: 0, height: 1 },

    shadowOpacity: 0.15,

    shadowRadius: 2,

    elevation: 2,

  },

  msgHubSwitchThumbOn: {

    marginLeft: 'auto',

  },

  msgHubSwitchLabel: {

    fontSize: 11,

    fontWeight: '800',

    color: '#64748b',

    position: 'absolute',

    right: 10,

  },

  msgHubSwitchLabelOn: {

    color: '#fff',

    left: 10,

    right: undefined,

  },

  msgHubSendBtn: {

    flexDirection: 'row',

    alignItems: 'center',

    gap: 8,

    backgroundColor: '#166534',

    paddingHorizontal: 18,

    paddingVertical: 12,

    borderRadius: 12,

  },

  msgHubSendBtnText: {

    color: '#fff',

    fontSize: 14,

    fontWeight: '800',

  },



  // Message Hub ΓÇö Proposal Form styles

  msgHubFormWrap: {

    gap: 16,

    paddingBottom: 8,

  },

  msgHubFormGroup: {

    gap: 6,

  },

  msgHubFormInput: {

    backgroundColor: '#fff',

    borderWidth: 1,

    borderColor: '#e2e8f0',

    borderRadius: 10,

    paddingHorizontal: 14,

    paddingVertical: 12,

    fontSize: 14,

    color: '#1e293b',

  },

  msgHubFormRow: {

    flexDirection: 'row',

    gap: 14,

  },

  msgHubDateTrigger: {

    flexDirection: 'row',

    alignItems: 'center',

    gap: 8,

    backgroundColor: '#fff',

    borderWidth: 1,

    borderColor: '#e2e8f0',

    borderRadius: 10,

    padding: 12,

    marginTop: 6,

  },

  msgHubDateText: {

    fontSize: 14,

    fontWeight: '500',

    color: '#1e293b',

  },

  msgHubAddrGrid: {

    gap: 10,

    marginTop: 4,

  },

  msgHubAddrItem: {

    flex: 1,

  },

  msgHubAddrLabel: {

    fontSize: 11,

    fontWeight: '700',

    color: '#64748b',

    marginBottom: 4,

    marginLeft: 4,

  },

  msgHubAddrPickerBorder: {

    backgroundColor: '#fff',

    borderWidth: 1,

    borderColor: '#e2e8f0',

    borderRadius: 10,

    overflow: 'hidden',

  },

  msgHubAddrPicker: {

    height: 46,

    width: '100%',

  },

  msgHubBtnRow: {

    flexDirection: 'row',

    gap: 10,

    flexWrap: 'wrap',

  },

  msgHubSubmitProposalBtn: {

    flexDirection: 'row',

    alignItems: 'center',

    gap: 8,

    backgroundColor: '#d97706',

    paddingHorizontal: 18,

    paddingVertical: 12,

    borderRadius: 12,

  },



  // ΓöÇΓöÇ Proposal Card Styles ΓöÇΓöÇ

  proposalMsgCard: {

    backgroundColor: '#fff',

    borderRadius: 12,

    width: '100%',

    height: 200,

    minHeight: 200,

    maxHeight: 200,

    borderWidth: 1,

    borderColor: '#e2e8f0',

    shadowColor: '#000',

    shadowOffset: { width: 0, height: 2 },

    shadowOpacity: 0.04,

    shadowRadius: 6,

    elevation: 2,

    overflow: 'hidden',

  },

  propCardHeader: {

    flexDirection: 'row',

    alignItems: 'flex-start',

    gap: 10,

    padding: 12,

    borderBottomWidth: 1,

    borderBottomColor: '#f1f5f9',

    backgroundColor: '#fffbeb',

  },

  propCardIconBox: {

    width: 40,

    height: 40,

    borderRadius: 8,

    backgroundColor: '#fef3c7',

    alignItems: 'center',

    justifyContent: 'center',

    flexShrink: 0,

  },

  propCompactIconBox: {

    width: 40,

    height: 40,

    borderRadius: 12,

    alignItems: 'center',

    justifyContent: 'center',

  },

  propCardTitle: {

    fontSize: 15,

    fontWeight: '700',

    color: '#92400e',

    lineHeight: 20,

  },

  propCardSubtitle: {

    fontSize: 12,

    fontWeight: '600',

    color: '#d97706',

    textTransform: 'uppercase',

    marginTop: 2,

  },

  propApprovedBadge: {

    flexDirection: 'row',

    alignItems: 'center',

    gap: 4,

    backgroundColor: '#f0fdf4',

    paddingHorizontal: 8,

    paddingVertical: 4,

    borderRadius: 8,

    borderWidth: 1,

    borderColor: '#dcfce7',

  },

  propApprovedText: {

    fontSize: 12,

    fontWeight: '800',

    color: '#166534',

  },

  propCardBody: {

    padding: 12,

    flex: 1,

  },

  propCardDesc: {

    fontSize: 13,

    color: '#475569',

    lineHeight: 19,

    marginBottom: 12,

    height: 38,

  },

  propCardMetaGrid: {

    flexDirection: 'row',

    flexWrap: 'nowrap',

    gap: 8,

    height: 32,

  },

  propCardMetaItem: {

    flex: 1,

    flexDirection: 'row',

    alignItems: 'center',

    gap: 4,

    backgroundColor: '#f8fafc',

    paddingHorizontal: 8,

    paddingVertical: 6,

    borderRadius: 8,

    minWidth: 0,

  },

  propCardMetaText: {

    fontSize: 12,

    fontWeight: '600',

    color: '#64748b',

    flex: 1,

  },

  propCardFooter: {

    flexDirection: 'row',

    padding: 16,

    gap: 10,

    borderTopWidth: 1,

    borderTopColor: '#f1f5f9',

    backgroundColor: '#fafafa',

  },

  propCardEditBtn: {

    flex: 1,

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'center',

    gap: 6,

    backgroundColor: '#fff',

    borderWidth: 1,

    borderColor: '#e2e8f0',

    paddingVertical: 10,

    borderRadius: 10,

  },

  propCardEditBtnText: {

    fontSize: 13,

    fontWeight: '700',

    color: '#475569',

  },

  propCardApproveBtn: {

    flex: 1,

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'center',

    gap: 6,

    backgroundColor: '#166534',

    paddingVertical: 10,

    borderRadius: 10,

  },

  propCardApproveBtnText: {

    fontSize: 13,

    fontWeight: '700',

    color: '#fff',

  },

  relatedProposalsSection: {

    padding: 16,

    marginBottom: 16,

    borderRadius: 16,

    backgroundColor: '#f8fafc',

  },

  relatedProposalsLabel: {

    fontSize: 13,

    fontWeight: '700',

    color: '#64748b',

    marginBottom: 12,

  },

  propCardViewBtn: {

    flex: 1,

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'center',

    gap: 6,

    paddingVertical: 10,

  },

  propCardViewBtnText: {

    fontSize: 13,

    fontWeight: '800',

    color: '#166534',

  },

  modalOverlay: {

    position: 'absolute',

    top: 0,

    left: 0,

    right: 0,

    bottom: 0,

    backgroundColor: 'rgba(0, 0, 0, 0.5)',

    justifyContent: 'center',

    alignItems: 'center',

    zIndex: 1000,

  },

  modalContainer: {

    backgroundColor: '#fff',

    borderRadius: 12,

    padding: 20,

    shadowColor: '#000',

    shadowOffset: { width: 0, height: 4 },

    shadowOpacity: 0.3,

    shadowRadius: 8,

    elevation: 10,

  },

  modalTitle: {

    fontSize: 18,

    fontWeight: '700',

    color: '#1e293b',

  },

  input: {

    borderWidth: 1,

    borderColor: '#cbd5e1',

    borderRadius: 10,

    paddingHorizontal: 12,

    paddingVertical: 10,

    color: '#0f172a',

    backgroundColor: '#ffffff',

  },

  propTapHint: {

    fontSize: 11,

    color: '#94a3b8',

    textAlign: 'center',

    paddingVertical: 8,

    paddingHorizontal: 12,

    fontStyle: 'italic',

  },

  emojiBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
  },

  emojiBtnActive: {
    backgroundColor: '#dcfce7',
  },

  emojiPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },

  emojiItem: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  emojiText: {
    fontSize: 18,
  },

});

// Inline proposal draft card styles (separate from main StyleSheet to keep things clean)
const inlineStyles = StyleSheet.create({
  draftCardWrap: {
    marginHorizontal: 4,
    marginBottom: 6,
  },
  draftCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  draftCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#f8fafc',
  },
  draftCardIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  draftCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  draftCardSub: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 1,
  },
  draftBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#ede9fe',
    borderWidth: 1,
    borderColor: '#c4b5fd',
  },
  draftBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#7c3aed',
    letterSpacing: 0.5,
  },
  draftCardBody: {
    padding: 10,
    gap: 8,
  },
  draftRow: {
    flexDirection: 'row',
    gap: 8,
  },
  draftRowMobile: {
    flexDirection: 'column',
    gap: 6,
  },
  draftGroup: {
    gap: 3,
  },
  draftLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  draftInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 12,
    color: '#1e293b',
  },
  draftDateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  draftDateText: {
    fontSize: 12,
    color: '#1e293b',
    fontWeight: '500',
  },
  draftPickerBorder: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  draftPicker: {
    height: 38,
    width: '100%',
  },
  draftAttachCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 6,
  },
  draftAttachThumb: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: '#e2e8f0',
  },
  draftAttachDocIcon: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  draftAttachMeta: {
    flex: 1,
    minWidth: 0,
    marginRight: 40,
  },
  draftAttachName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1e293b',
  },
  draftAttachDownload: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  draftAttachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  draftAttachBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  draftFooter: {
    flexDirection: 'row',
    gap: 8,
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#fafafa',
    justifyContent: 'flex-end',
  },
  draftEditBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  draftEditBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  draftSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#166534',
  },
  draftSubmitBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
  },
  planBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  approvedNoticeContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#bbf7d0',
    padding: 16,
    gap: 12,
    maxWidth: 480,
    width: '100%',
    shadowColor: '#166534',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  approvedNoticeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  approvedNoticeIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  approvedNoticeBadgePill: {
    alignSelf: 'flex-start',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    marginBottom: 4,
  },
  approvedNoticeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#166534',
    letterSpacing: 0.5,
  },
  approvedNoticeHeadline: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 20,
  },
  approvedNoticeButton: {
    backgroundColor: '#166534',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#166534',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  approvedNoticeButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});


