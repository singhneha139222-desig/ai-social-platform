import React, { useState } from 'react';
import { View, TouchableOpacity, Image, FlatList, Modal, StyleSheet, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';

const STICKER_SEEDS = [
  'Mimi', 'Felix', 'Bella', 'Charlie', 'Milo', 
  'Lola', 'Buster', 'Daisy', 'Sadie', 'Max',
  'Maggie', 'Abby', 'Simba', 'Gizmo', 'Boots',
  'Toby', 'Bandit', 'Oscar', 'Chloe', 'Angel'
];

export default function StickerPicker({ onSelect, style }) {
  const [modalVisible, setModalVisible] = useState(false);

  const handleSelect = (seed) => {
    setModalVisible(false);
    onSelect(`https://api.dicebear.com/7.x/bottts/png?seed=${seed}&size=128`);
  };

  const renderItem = ({ item }) => {
    const url = `https://api.dicebear.com/7.x/bottts/png?seed=${item}&size=128`;
    return (
      <TouchableOpacity style={styles.stickerItem} onPress={() => handleSelect(item)}>
        <Image source={{ uri: url }} style={styles.stickerImage} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={style}>
      <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.openButton}>
        <Feather name="smile" size={24} color="#666" />
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPressOut={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose a Sticker</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Feather name="x" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={STICKER_SEEDS}
              renderItem={renderItem}
              keyExtractor={item => item}
              numColumns={4}
              contentContainerStyle={styles.grid}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  openButton: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    height: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  grid: {
    alignItems: 'center',
  },
  stickerItem: {
    padding: 5,
    margin: 5,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
  },
  stickerImage: {
    width: 60,
    height: 60,
  }
});
