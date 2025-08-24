import React from "react";
import { View, StyleSheet } from "react-native";

// Import your SVG components directly!
// The path is relative to this file.
import PoseStanding from "../../assets/svgs/poses/robot_dance_3.svg";
import HeadCornrows from "../../assets/svgs/heads/cornrows.svg";
import HatBeanie from "../../assets/svgs/heads/hat_beanie.svg";
import FaceSmile from "../../assets/svgs/faces/smile.svg";
import Glasses from "../../assets/svgs/accessories/glasses.svg";

// Let's assume a default size for the avatar's artboard (viewBox)
const AVATAR_SIZE = 500;

const Avatar = () => {
  // In the future, you'll get the components to render from props.
  // For now, let's hardcode them to show the layering.

  return (
    <View style={styles.container}>
      {/* 
        The order of components here determines the stacking order (z-index).
        The first component is at the bottom, the last is at the top.
      */}
      <PoseStanding style={styles.part} width="100%" height="100%" />
      <HatBeanie style={styles.part} width="100%" height="100%" />
      <FaceSmile style={styles.part} width="100%" height="100%" />
      <Glasses style={styles.part} width="100%" height="100%" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 250, // The display size on the screen
    height: 250,
    position: "relative", // This is the positioning context
  },
  part: {
    position: "absolute", // This makes all parts stack on top of each other
    top: 0,
    left: 0,
  },
});

export default Avatar;
