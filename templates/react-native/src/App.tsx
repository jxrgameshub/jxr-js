import { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { jxrCrypto } from '@jxrstudios/jxr';

export default function App() {
  const [count, setCount] = useState(0);
  const [hash, setHash] = useState<string>('');

  useEffect(() => {
    jxrCrypto.hashModule(String(count)).then((h) => setHash(h.digest.slice(0, 16)));
  }, [count]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>JXR Native</Text>
      <Text style={styles.subtitle}>Web Crypto on React Native</Text>

      <Pressable style={styles.button} onPress={() => setCount((c) => c + 1)}>
        <Text style={styles.buttonText}>Count: {count}</Text>
      </Pressable>

      <Text style={styles.hash}>SHA-256: {hash || '...'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a0a' },
  title: { fontSize: 32, fontWeight: '800', color: '#ea580c', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#6b7280', marginBottom: 32 },
  button: { backgroundColor: '#ea580c', paddingVertical: 12, paddingHorizontal: 32, borderRadius: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  hash: { marginTop: 24, fontFamily: 'monospace', fontSize: 12, color: '#4b5563' },
});
