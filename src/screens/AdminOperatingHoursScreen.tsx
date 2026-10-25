import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Switch,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import {
  getAdminOperatingHours,
  saveAdminOperatingHour,
  OperatingHourItem,
} from '../services/operatingHoursAdminService';

const DAYS = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

export default function AdminOperatingHoursScreen() {
  const [hours, setHours] = useState<Record<number, OperatingHourItem>>({});
  const [loading, setLoading] = useState(true);
  const [savingDay, setSavingDay] = useState<number | null>(null);

  const loadHours = async () => {
    try {
      setLoading(true);
      const data = await getAdminOperatingHours();
      
      const hoursMap: Record<number, OperatingHourItem> = {};
      // Inicializa o mapa padrão com 08:00 às 18:00
      DAYS.forEach((_, idx) => {
        hoursMap[idx] = {
          day_of_week: idx,
          open_time: '08:00',
          close_time: '18:00',
          is_closed: idx === 0, // Domingo fechado por padrão
        };
      });

      data.forEach((item) => {
        hoursMap[item.day_of_week] = item;
      });

      setHours(hoursMap);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar os horários de funcionamento.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHours();
  }, []);

  const handleUpdateField = (dayIndex: number, field: keyof OperatingHourItem, value: any) => {
    setHours((prev) => ({
      ...prev,
      [dayIndex]: {
        ...prev[dayIndex],
        [field]: value,
      },
    }));
  };

  const handleSaveDay = async (dayIndex: number) => {
    const item = hours[dayIndex];
    try {
      setSavingDay(dayIndex);
      await saveAdminOperatingHour({
        day_of_week: item.day_of_week,
        open_time: item.open_time,
        close_time: item.close_time,
        is_closed: item.is_closed,
      });
      Alert.alert('Sucesso', `Horário de ${DAYS[dayIndex]} salvo com sucesso!`);
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Falha ao salvar horário.');
    } finally {
      setSavingDay(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#38bdf8" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Horários de Funcionamento</Text>
      </View>

      <FlatList
        data={DAYS}
        keyExtractor={(_, index) => index.toString()}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item: dayName, index }) => {
          const config = hours[index] || {
            day_of_week: index,
            open_time: '08:00',
            close_time: '18:00',
            is_closed: false,
          };

          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.dayTitle}>{dayName}</Text>
                <View style={styles.switchRow}>
                  <Text style={styles.closedLabel}>
                    {config.is_closed ? 'Fechado' : 'Aberto'}
                  </Text>
                  <Switch
                    value={!config.is_closed}
                    onValueChange={(val) => handleUpdateField(index, 'is_closed', !val)}
                    trackColor={{ false: '#334155', true: '#0284c7' }}
                    thumbColor={!config.is_closed ? '#38bdf8' : '#94a3b8'}
                  />
                </View>
              </View>

              {!config.is_closed && (
                <View style={styles.timesRow}>
                  <View style={styles.timeInputGroup}>
                    <Text style={styles.label}>Abertura</Text>
                    <TextInput
                      style={styles.timeInput}
                      value={config.open_time}
                      onChangeText={(t) => handleUpdateField(index, 'open_time', t)}
                      placeholder="08:00"
                      placeholderTextColor="#64748b"
                      maxLength={5}
                    />
                  </View>

                  <Text style={styles.timeSeparator}>até</Text>

                  <View style={styles.timeInputGroup}>
                    <Text style={styles.label}>Fechamento</Text>
                    <TextInput
                      style={styles.timeInput}
                      value={config.close_time}
                      onChangeText={(t) => handleUpdateField(index, 'close_time', t)}
                      placeholder="18:00"
                      placeholderTextColor="#64748b"
                      maxLength={5}
                    />
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={() => handleSaveDay(index)}
                disabled={savingDay === index}
              >
                <FontAwesome5 name="save" size={12} color="#0f172a" style={{ marginRight: 6 }} />
                <Text style={styles.saveBtnText}>
                  {savingDay === index ? 'Salvando...' : 'Salvar Dia'}
                </Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 16 },
  centerContainer: { flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' },
  header: { marginBottom: 20, marginTop: 20 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#f1f5f9' },
  card: { backgroundColor: '#1e293b', borderRadius: 12, borderWidth: 1, borderColor: '#334155', padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dayTitle: { fontSize: 16, fontWeight: 'bold', color: '#f1f5f9' },
  switchRow: { flexDirection: 'row', alignItems: 'center' },
  closedLabel: { color: '#94a3b8', fontSize: 13, marginRight: 8, fontWeight: '600' },
  timesRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#334155' },
  timeInputGroup: { flex: 1 },
  label: { fontSize: 12, color: '#cbd5e1', marginBottom: 4, fontWeight: '500' },
  timeInput: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155', borderRadius: 6, paddingHorizontal: 10, height: 40, color: '#ffffff', textAlign: 'center', fontWeight: 'bold' },
  timeSeparator: { color: '#64748b', marginHorizontal: 12, marginTop: 16, fontWeight: 'bold' },
  saveBtn: { backgroundColor: '#38bdf8', borderRadius: 6, height: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  saveBtnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 13 },
});