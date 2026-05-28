import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState } from 'react';
import { Dimensions, Image, SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');


const SLIDES = [
  {
    id: '1',
    title: 'Welcome to Vault',
    description: 'The ultimate offline-first command center built exclusively for your Vape Shop.',
    icon: 'mascot', 
  },
  {
    id: '2',
    title: 'Blazing Fast POS',
    description: 'Zero cloud delays. Process sales, calculate totals, and sync inventory instantly right from your device.',
    icon: '⚡',
  },
  {
    id: '3',
    title: 'Track & Flex',
    description: 'Monitor your all-time revenue trends and blast available stock updates straight to your social stories.',
    icon: '🚀',
  },
];

export default function OnboardingScreen({ onFinish }: { onFinish: () => void }) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleNext = async () => {
    if (currentSlide < SLIDES.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      // Save to storage so this never shows again
      await AsyncStorage.setItem('@has_onboarded', 'true');
      onFinish();
    }
  };

  const slide = SLIDES[currentSlide];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.content}>
        {/* Dynamic Graphic Container */}
        <View style={styles.graphicContainer}>
          {slide.icon === 'mascot' ? (
            <Image 
              source={require('../assets/images/mascot.png')} // Make sure path matches your setup
              style={styles.mascotImage}
              resizeMode="contain"
            />
          ) : (
            <Text style={styles.emojiGraphic}>{slide.icon}</Text>
          )}
        </View>

        {/* Text Content */}
        <View style={styles.textContainer}>
          <Text style={styles.title}>{slide.title}</Text>
          <Text style={styles.description}>{slide.description}</Text>
        </View>

        {/* Custom Progress Dots */}
        <View style={styles.paginationContainer}>
          {SLIDES.map((_, index) => (
            <View 
              key={index} 
              style={[
                styles.dot, 
                currentSlide === index && styles.activeDot
              ]} 
            />
          ))}
        </View>
      </View>

      {/* Action Button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.button} onPress={handleNext}>
          <Text style={styles.buttonText}>
            {currentSlide === SLIDES.length - 1 ? "Let's Go 🔥" : "Next"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  graphicContainer: {
    height: width * 0.6,
    width: width * 0.6,
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    borderRadius: (width * 0.6) / 2,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 48,
  },
  mascotImage: {
    width: '70%',
    height: '70%',
  },
  emojiGraphic: {
    fontSize: 80,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    color: '#a1a1aa',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
    textAlign: 'center',
  },
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#27272a',
    marginHorizontal: 4,
  },
  activeDot: {
    width: 24,
    backgroundColor: '#10b981', // Emerald green
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  button: {
    backgroundColor: '#10b981',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '900',
  },
});