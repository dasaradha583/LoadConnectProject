import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface DebugInfoProps {
  user: any;
  load: any;
  isTracking: boolean;
}

const DebugInfo: React.FC<DebugInfoProps> = ({ user, load, isTracking }) => {
  if (!__DEV__) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🐛 Debug Info</Text>
      <Text style={styles.text}>User Type: {user?.type || 'null'}</Text>
      <Text style={styles.text}>User ID: {user?.id || 'null'}</Text>
      <Text style={styles.text}>Load Status: {load?.status || 'null'}</Text>
      <Text style={styles.text}>Load ID: {load?.id?.slice(-6) || 'null'}</Text>
      <Text style={styles.text}>Is Tracking: {isTracking ? 'true' : 'false'}</Text>
      <Text style={styles.text}>Driver ID: {load?.driverId?.slice(-6) || 'null'}</Text>
      <Text style={styles.text}>Should Show Buttons: {user?.type === 'driver' ? 'YES' : 'NO'}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff3cd',
    padding: 12,
    margin: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 8,
  },
  text: {
    fontSize: 12,
    color: '#856404',
    marginBottom: 4,
  },
});

export default DebugInfo;
