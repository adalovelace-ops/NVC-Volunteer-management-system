import React from 'react';
import { View, Text, Modal, TouchableOpacity, Image, ScrollView, Alert } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { getAttachmentLabel, isImageMediaUri, openAttachmentUri } from '../utils/media';

// Props: visible, onClose, user (User | null)
export default function UserAccountDetailsModal({ visible, onClose, user }: { visible: boolean; onClose: () => void; user: any }) {
  if (!user) return null;

  const isVolunteer = user?.role === 'volunteer' || Boolean(user?.volunteerMembershipSheet);
  const isPartner = user?.role === 'partner' || Boolean(user?.partnerRegistration);

  const validIdPhoto = user?.volunteerMembershipSheet?.validIdPhoto || user?.partnerRegistration?.validIdPhoto || user?.validIdPhoto || '';
  const trainingCertificate = user?.volunteerMembershipSheet?.certificationsOrTrainings || user?.certificationsOrTrainings || '';
  const documents: string[] = user?.partnerRegistration?.registrationDocuments || user?.registrationDocuments || [];

  const docItems = [
    { name: 'Valid ID', uri: validIdPhoto },
    ...(isVolunteer ? [{ name: 'Training Certificate', uri: trainingCertificate }] : []),
    ...(isPartner ? documents.map((docUri, idx) => ({ name: `Registration Document ${idx + 1}`, uri: docUri })) : []),
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
        <View style={{ backgroundColor: '#fff', borderRadius: 16, maxHeight: '90%', padding: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 12 }}>
            <View>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#0f172a' }}>{user.name || 'Account Details'}</Text>
              <Text style={{ fontSize: 12, color: '#64748b' }}>{isVolunteer ? 'Volunteer Profile' : isPartner ? 'Partner Organization' : 'User Details'}</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialIcons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ marginTop: 16 }} showsVerticalScrollIndicator={false}>
            {/* Documents Section */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#475569', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Documents
              </Text>
              <View style={{ gap: 8 }}>
                {docItems.map((doc, idx) => (
                  <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                      <MaterialIcons name="attachment" size={18} color="#64748b" style={{ marginRight: 8 }} />
                      <Text style={{ fontSize: 14, color: '#334155', fontWeight: '500' }}>{doc.name}</Text>
                    </View>
                    {doc.uri ? (
                      <TouchableOpacity
                        onPress={async () => {
                          try {
                            await openAttachmentUri(doc.uri);
                          } catch (error: any) {
                            Alert.alert('Document View Failed', error?.message || 'Unable to open document.');
                          }
                        }}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#bbf7d0', backgroundColor: '#f0fdf4', borderRadius: 8 }}
                      >
                        <MaterialIcons name="visibility" size={16} color="#166534" />
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#166534' }}>View</Text>
                      </TouchableOpacity>
                    ) : (
                      <Text style={{ fontSize: 12, color: '#94a3b8', fontWeight: '500' }}>Missing</Text>
                    )}
                  </View>
                ))}
              </View>
            </View>

            {/* Valid ID Image Preview if Available */}
            {validIdPhoto && isImageMediaUri(validIdPhoto) ? (
              <View style={{ marginTop: 12 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748b', marginBottom: 6 }}>Valid ID Preview</Text>
                <TouchableOpacity
                  onPress={async () => {
                    try { await openAttachmentUri(validIdPhoto); } catch (_) {}
                  }}
                  style={{ padding: 4, backgroundColor: '#f8fafc', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' }}
                >
                  <Image source={{ uri: validIdPhoto }} style={{ width: '100%', height: 180, borderRadius: 6, resizeMode: 'contain' }} />
                </TouchableOpacity>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
