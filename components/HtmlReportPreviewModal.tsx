import React, { useState } from 'react';
import { ActivityIndicator, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { downloadHtmlPdf } from '../utils/pdfDownload';

interface HtmlReportPreviewModalProps {
  visible: boolean;
  title: string;
  subtitle: string;
  html: string;
  filename: string;
  onClose: () => void;
}

export default function HtmlReportPreviewModal({ visible, title, subtitle, html, filename, onClose }: HtmlReportPreviewModalProps) {
  const [isExporting, setIsExporting] = useState(false);

  const exportPdf = async () => {
    setIsExporting(true);
    try {
      await downloadHtmlPdf(filename, html);
    } finally {
      setIsExporting(false);
    }
  };

  if (!visible) return null;

  return <Modal visible transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.backdrop}>
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
          <TouchableOpacity onPress={onClose} accessibilityLabel="Close report preview"><MaterialIcons name="close" size={24} color="#64748b" /></TouchableOpacity>
        </View>
        {Platform.OS === 'web' ? <iframe srcDoc={html} title={title} style={styles.iframe as any} /> : <View style={styles.nativePreview}>
          <MaterialIcons name="picture-as-pdf" size={42} color="#347345" />
          <Text style={styles.nativeTitle}>Styled HTML report ready</Text>
          <Text style={styles.nativeCopy}>Export PDF to open system print preview.</Text>
        </View>}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}><Text style={styles.closeText}>Close</Text></TouchableOpacity>
          <TouchableOpacity style={styles.exportButton} onPress={() => void exportPdf()} disabled={isExporting}>
            {isExporting ? <ActivityIndicator color="#fff" /> : <MaterialIcons name="file-download" size={19} color="#fff" />}
            <Text style={styles.exportText}>{isExporting ? 'Preparing PDF...' : 'Export PDF'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,.7)', padding: 20, justifyContent: 'center' },
  card: { width: '100%', maxWidth: 1180, alignSelf: 'center', height: '92%', backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden' },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerCopy: { flex: 1 }, title: { fontSize: 16, fontWeight: '800', color: '#18241c' }, subtitle: { fontSize: 12, color: '#69766d', marginTop: 2 },
  iframe: { width: '100%', flex: 1, borderWidth: 0, backgroundColor: '#f7f8f7' },
  nativePreview: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 8, backgroundColor: '#f7f8f7' },
  nativeTitle: { color: '#18241c', fontWeight: '800', fontSize: 16 }, nativeCopy: { color: '#69766d', fontSize: 13, textAlign: 'center' },
  actions: { padding: 12, borderTopWidth: 1, borderTopColor: '#e2e8f0', flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  closeButton: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#eef1ef' }, closeText: { color: '#475569', fontWeight: '700' },
  exportButton: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#347345', flexDirection: 'row', alignItems: 'center', gap: 7 }, exportText: { color: '#fff', fontWeight: '800' },
});
