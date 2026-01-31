import React, { useEffect, useRef, useState } from 'react';
import {
    Dimensions,
    FlatList,
    Image,
    NativeScrollEvent,
    NativeSyntheticEvent,
    StyleSheet,
    Text,
    useColorScheme,
    View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/theme';
import { auth } from '../services/api';

const { width } = Dimensions.get('window');
const SLIDE_HEIGHT = 200;
const SLIDE_WIDTH = width - 40; 

const DATA = [
  {
    id: '1',
    title: 'University Event 2024',
    subtitle: 'Join us for the grand convocation.',
    image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=3270&auto=format&fit=crop',
  },
  {
    id: '2',
    title: 'New Library Blocks',
    subtitle: 'Explore the new study areas.',
    image: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=3270&auto=format&fit=crop',
  },
  {
    id: '3',
    title: 'Semester Finals',
    subtitle: 'Check your exam routine now.',
    image: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=3270&auto=format&fit=crop',
  },
];

interface HeroSliderProps {
    data?: any[];
}

export default function HeroSlider({ data }: HeroSliderProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const [activeIndex, setActiveIndex] = useState(0);
  const [banners, setBanners] = useState<any[]>(data || []);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (data && data.length > 0) {
        setBanners(data);
        return;
    }

    auth.getBanners().then(res => {
        if (res.data.success && res.data.data.length > 0) {
            const mapped = res.data.data.map((b: any) => ({
                id: b._id,
                title: b.title,
                subtitle: b.subtitle || '',
                image: b.imageUrl,
            }));
            setBanners(mapped);
        } else if (banners.length === 0) {
            setBanners(DATA);
        }
    }).catch(err => {
        console.log('Banner fetch failed', err);
        if (banners.length === 0) setBanners(DATA);
    });
  }, [data]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (banners.length === 0) return;
      if (activeIndex < banners.length - 1) {
        flatListRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
        setActiveIndex(activeIndex + 1);
      } else {
        flatListRef.current?.scrollToIndex({ index: 0, animated: true });
        setActiveIndex(0);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [activeIndex, banners]); 
  
  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    const roundIndex = Math.round(index);
    if (roundIndex !== activeIndex) {
        setActiveIndex(roundIndex);
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.slide}>
      <Image source={{ uri: item.image }} style={styles.image} resizeMode="cover" />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.9)']}
        locations={[0, 0.5, 1]}
        style={styles.overlay}
      >
        <Animated.View entering={FadeIn.delay(200)}>
            <Text style={styles.title}>{item.title}</Text>
            {item.subtitle ? <Text style={styles.subtitle}>{item.subtitle}</Text> : null}
        </Animated.View>
      </LinearGradient>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={banners}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      />
      
      <View style={styles.pagination}>
        {banners.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              {
                backgroundColor: index === activeIndex ? theme.primary : 'rgba(255, 255, 255, 0.5)',
                width: index === activeIndex ? 20 : 10,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: SLIDE_HEIGHT,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    width: SLIDE_WIDTH,
  },
  slide: {
    width: SLIDE_WIDTH,
    height: SLIDE_HEIGHT,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
    padding: 16,
    paddingBottom: 24,
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  subtitle: {
    color: '#eee',
    fontSize: 14,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  pagination: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
});
