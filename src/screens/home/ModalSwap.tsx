import React, { useEffect } from "react";
import { Animated, Modal, StyleSheet, View } from "react-native";
import { doneIcon } from "../../helper/ImageAssets";
import FastImage from "react-native-fast-image";
import { AppText, BLACK, EIGHTEEN,  MEDIUM, SEMI_BOLD, THIRTEEN, WHITE } from "../../shared";
import TouchableOpacityView from "../../shared/components/TouchableOpacityView";
import { smallButtonHeight, universalPaddingHorizontalHigh } from "../../theme/dimens";
import { colors } from "../../theme/colors";

const ModalSwap = ({ visible, handleVisiblity, onPress }: any) => {
    const [showModal, setShowModal] = React.useState(visible);
    const scaleValue = React.useRef(new Animated.Value(0)).current;
    useEffect(() => {
        setShowModal(visible)
    }, [visible])
    React.useEffect(() => {
        toggleModal();
    }, [visible]);
    const toggleModal = () => {
        if (visible) {
            setShowModal(true);
            Animated.spring(scaleValue, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();
        } else {
            setTimeout(() => setShowModal(false), 200);
            Animated.timing(scaleValue, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start();
        }
    };
    const handelPress = () => {
        handleVisiblity();
    };
    return (
        <Modal transparent  visible={showModal}>
            <TouchableOpacityView onPress={onPress} style={styles.modalBackGround}>
                <Animated.View
                    style={[styles.modalContainer, { transform: [{ scale: scaleValue }] }]}>
                    <View style={styles.container}>

                        <View style={styles.imageContainer}>
                            <FastImage
                                resizeMode="contain"
                                source={doneIcon}
                                style={styles.icon}
                            />
                        </View>
                        <AppText type={EIGHTEEN} weight={SEMI_BOLD}>
                            Success!
                        </AppText>
                        <AppText weight={MEDIUM}>
                            You have successfully Swap NEXB Coin
                        </AppText>
                        {/* <GradientButton
                            children="OK"
                            onPress={() => handelPress()}
                            containerStyle={styles.button}
                        /> */}
                    </View>
                </Animated.View>
            </TouchableOpacityView>
        </Modal>
    )
};
export default ModalSwap;
const styles = StyleSheet.create({
    modalBackGround: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        width: '90%',
        backgroundColor: '#36363F',
        paddingHorizontal: 15,
        paddingVertical: 25,
        borderRadius: 20,
        elevation: 20,
    },
    imageContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 15,
    },
    icon: {
        height: 76,
        width: 76,
    },
    container: {
        justifyContent: 'center',
        alignItems: "center"
    },
    actionBtn: {
        height: smallButtonHeight,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 5,
        backgroundColor: colors.buttonBg,
        paddingHorizontal: universalPaddingHorizontalHigh,
    },
    button: {
        width: '50%',
        marginTop: 25,
    }
})
