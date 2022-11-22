import imageToBase64 from "image-to-base64";
const imgPath = process.env.EXECUTE_ENV==="PROD"?"../../image/":"./image/";

const icon_normal = [
    "random_01.png",
    "random_02.png",
    "random_03.png"
]
  
const icon_select = [
    "random_01_select.png",
    "random_02_select.png",
    "random_03_select.png"
]
  
const icon_gray = [
    "random_01_gray.png",
    "random_02_gray.png",
    "random_03_gray.png"
]
export let icon_normal_1;
export let icon_normal_2;
export let icon_normal_3;
  
export let icon_select_1;
export let icon_select_2;
export let icon_select_3;
  
export let icon_gray_1;
export let icon_gray_2;
export let icon_gray_3;

export let birth_background;

export let secretMessageIcon1;
export let secretMessageIcon2;
export let secretMessageIcon3;

export let secretMessageBackground1;
export let secretMessageBackground2;
export let secretMessageBackground3;

const initImages = async () => {
    icon_normal_1 = await imageToBase64(imgPath + icon_normal[0]);
    icon_normal_2 = await imageToBase64(imgPath + icon_normal[1]);
    icon_normal_3 = await imageToBase64(imgPath + icon_normal[2]);
      
    icon_select_1 = await imageToBase64(imgPath + icon_select[0]);
    icon_select_2 = await imageToBase64(imgPath + icon_select[1]);
    icon_select_3 = await imageToBase64(imgPath + icon_select[2]);
      
    icon_gray_1 = await imageToBase64(imgPath + icon_gray[0]);
    icon_gray_2 = await imageToBase64(imgPath + icon_gray[1]);
    icon_gray_3 = await imageToBase64(imgPath + icon_gray[2]);

    birth_background = await imageToBase64(imgPath + "birth_background.jpg");

    secretMessageIcon1 = await imageToBase64(imgPath + "background_icon_01.png");
    secretMessageIcon2 = await imageToBase64(imgPath + "background_icon_02.png");
    secretMessageIcon3 = await imageToBase64(imgPath + "background_icon_03.png");

    secretMessageBackground1 = await imageToBase64(imgPath + "background_01.png");
    secretMessageBackground2 = await imageToBase64(imgPath + "background_02.png");
    secretMessageBackground3 = await imageToBase64(imgPath + "background_03.png");
}

initImages();