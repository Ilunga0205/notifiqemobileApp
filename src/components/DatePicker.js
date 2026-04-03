// src/components/DatePicker.js
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal,
  StyleSheet, Platform, Pressable,
} from 'react-native';
import { colors, typography, spacing, radius } from '../lib/tokens';

let DateTimePicker;
try {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
} catch (e) {
  DateTimePicker = null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export const dateToStr = (date) => {
  if (!date) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const strToDate = (str) => {
  if (!str) return null;
  return new Date(str + 'T00:00:00');
};

function formatDate(date) {
  if (!date) return '';
  return date.toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

// ── Single date picker ────────────────────────────────────────────────────────

export function DatePicker({ label, value, onChange, minDate, maxDate, placeholder = 'Select a date' }) {
  const [show, setShow] = useState(false);
  const [tempDate, setTempDate] = useState(null);

  const handleChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShow(false);
      if (event.type === 'set' && selectedDate) onChange(selectedDate);
    } else {
      if (selectedDate) setTempDate(selectedDate);
    }
  };

  const handleDone = () => {
    if (tempDate) onChange(tempDate);
    setTempDate(null);
    setShow(false);
  };

  const handleCancel = () => {
    setTempDate(null);
    setShow(false);
  };

  const handleOpen = () => {
    // Open on current value — or today if none set
    setTempDate(value instanceof Date ? value : new Date());
    setShow(true);
  };

  if (!DateTimePicker) {
    return (
      <View>
        {label ? <Text style={styles.label}>{label}</Text> : null}
        <View style={styles.field}>
          <Text style={[styles.fieldText, !value && styles.fieldPlaceholder]}>
            {value ? formatDate(value) : 'Install @react-native-community/datetimepicker'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <TouchableOpacity
        style={[styles.field, value && styles.fieldFilled]}
        onPress={handleOpen}
        activeOpacity={0.8}
      >
        <View style={styles.calIcon}>
          <View style={styles.calIconHeader} />
          <View style={styles.calIconGrid}>
            {[0,1,2,3,4,5].map(i => <View key={i} style={styles.calIconDot} />)}
          </View>
        </View>
        <Text style={[styles.fieldText, !value && styles.fieldPlaceholder]}>
          {value ? formatDate(value) : placeholder}
        </Text>
        {value ? (
          <TouchableOpacity onPress={() => onChange(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.clearBtn}>✕</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.chevron}>›</Text>
        )}
      </TouchableOpacity>

      {/* Android — native dialog */}
      {show && Platform.OS === 'android' && (
        <DateTimePicker
          value={value || new Date()}
          mode="date"
          display="default"
          onChange={handleChange}
          minimumDate={minDate}
          maximumDate={maxDate}
        />
      )}

      {/* iOS — bottom sheet with spinner */}
      {Platform.OS === 'ios' && (
        <Modal visible={show} transparent animationType="slide" onRequestClose={handleCancel}>
          <Pressable style={styles.overlay} onPress={handleCancel}>
            <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
              <View style={styles.sheetHeader}>
                <TouchableOpacity onPress={handleCancel} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.sheetTitle}>{label || 'Select date'}</Text>
                <TouchableOpacity onPress={handleDone} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.doneText}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempDate || value || new Date()}
                mode="date"
                display="spinner"
                onChange={handleChange}
                minimumDate={minDate}
                maximumDate={maxDate}
                style={{ width: '100%', height: 200 }}
              />
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

// ── Date range picker ─────────────────────────────────────────────────────────

export function DateRangePicker({ startDate, endDate, onStartChange, onEndChange, startLabel = 'Start date', endLabel = 'End date' }) {
  const handleStartChange = (date) => {
    onStartChange(date);
    // If end date is before new start, reset it
    if (date && endDate && endDate < date) onEndChange(null);
  };

  return (
    <View style={styles.rangeWrap}>
      <View style={{ flex: 1 }}>
        {/* No maxDate — allow any future date */}
        <DatePicker label={startLabel} value={startDate} onChange={handleStartChange} />
      </View>
      <View style={styles.rangeSep}>
        <Text style={styles.rangeSepText}>—</Text>
      </View>
      <View style={{ flex: 1 }}>
        {/* minDate = startDate so end can't be before start */}
        <DatePicker label={endLabel} value={endDate} onChange={onEndChange} minDate={startDate || undefined} placeholder="Same day" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label:          { fontSize: 11, fontWeight: typography.bold, color: colors.subtle, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
  field:          { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 12, backgroundColor: colors.white },
  fieldFilled:    { borderColor: colors.brand + '60', backgroundColor: '#EFF6FF' },
  calIcon:        { width: 18, height: 18, borderWidth: 1.5, borderColor: colors.muted, borderRadius: 3, overflow: 'hidden' },
  calIconHeader:  { height: 5, backgroundColor: colors.muted },
  calIconGrid:    { flex: 1, flexDirection: 'row', flexWrap: 'wrap', padding: 1, gap: 1 },
  calIconDot:     { width: 3, height: 3, borderRadius: 1, backgroundColor: colors.border },
  fieldText:      { flex: 1, fontSize: 14, color: colors.black, fontWeight: typography.medium },
  fieldPlaceholder:{ color: colors.placeholder, fontWeight: '400' },
  clearBtn:       { fontSize: 13, color: colors.placeholder },
  chevron:        { fontSize: 16, color: colors.placeholder },
  overlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet:          { backgroundColor: colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32 },
  sheetHeader:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.page, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  sheetTitle:     { fontSize: 15, fontWeight: typography.semibold, color: colors.black },
  cancelText:     { fontSize: 15, color: colors.muted },
  doneText:       { fontSize: 15, color: colors.brand, fontWeight: typography.semibold },
  rangeWrap:      { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  rangeSep:       { paddingBottom: 14 },
  rangeSepText:   { fontSize: 16, color: colors.muted },
});