import { Linking, Alert } from 'react-native';

export const openAppUrl = async (url: string) => {
    if (!url) return;
    try {
        // Special handling for common interactive schemes that can fail canOpenURL on some platforms
        const isCommonScheme = url.startsWith('tel:') || url.startsWith('whatsapp:') || url.startsWith('mailto:');
        
        if (isCommonScheme) {
            await Linking.openURL(url);
            return;
        }

        const supported = await Linking.canOpenURL(url);
        if (supported) {
            await Linking.openURL(url);
        } else {
            // If canOpenURL fails, we still try to open it as a last resort before alerting
            try {
                await Linking.openURL(url);
            } catch (e) {
                Alert.alert("Error", "Don't know how to open this URL: " + url);
            }
        }
    } catch (error) {
        console.error("Link open error", error);
        Alert.alert("Link error", "Failed to open link: " + url);
    }
};

export const handleCall = (number: string) => number && openAppUrl(`tel:${number}`);

export const handleWhatsApp = (number: string) => {
    if (!number) return;
    let formatted = number.startsWith('+') ? number : '+880' + number.replace(/^0+/, ''); 
    openAppUrl(`whatsapp://send?phone=${formatted}`);
};
