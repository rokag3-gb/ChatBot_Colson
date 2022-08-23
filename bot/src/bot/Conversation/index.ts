import { TurnContext } from "botbuilder";
import { getWorkplace } from "../getWorkplace";

const greetingText = ["안녕", "hi", "hello", "콜슨", "반가워", "어이", "여어"];
const peopleText = [];
const getWorkplaceText = ["나오니", "출근", "근무", "일정"];
const getMealStoreText = ["밥", "점심", "먹을거", "먹을까"];
const weatherText = ["날씨", "비오", "비내"];
const dateText = ["오늘", "내일", "모레", "어제", "지금"];
const placeText = ["구로", "서울", "회사", "신도림"];

const textArray = [greetingText, peopleText, getWorkplaceText, getMealStoreText, weatherText, dateText, placeText];

export const pushPeople = async (name: string) => {
    if(peopleText.indexOf(name) === -1) {
        peopleText.push(name);
    }
}

//export const checkConversation = async (context: TurnContext, text: string[]) => {
export const checkConversation = async (context: TurnContext, text: string) => {
    const textContainArray = wordSplitCheck(text);
    await wordProcess(context, textContainArray);
}

const wordSplitCheck = (text: string):string[][] => {
    const textContainArray = [];
    for(let i = 0; i < textArray.length; i++) {
        const textArr = [];
        for(let j = 0; j < textArray[i].length; j++) {
            if(text.indexOf(textArray[i][j]) >= 0) {
                textArr.push(textArray[i][j]);
            }
        }
        textContainArray.push(textArr);
    }
    return textContainArray;
}

const wordProcess = async (context: TurnContext, arr: string[][]) => {
    let resultText = "";

    if(arr[0].length !== 0) {
        resultText += "안녕하세요!\n\n"
    }

    if(arr[1].length === 1 && arr[2].length !== 0) {
        resultText += `${arr[1][0]} 님의 근무지를 조회할게요.`;
        await context.sendActivity(resultText.length===0?`처리할 수 없는 메시지입니다. 다시 시도해주세요.`:resultText);
        await getWorkplace(context, arr[1][0], null);
        return
    }

    if(arr[4].length !== 0) {
        if(arr[5].length === 1) {
            if(arr[6].length === 1) {
                resultText += `${arr[6][0]}의 ${arr[5][0]} 날씨를 검색할게요.\n\n`;
            } else {
                resultText += `${arr[5][0]}의 날씨를 검색할게요.\n\n`;
            }
        } else {
            if(arr[6].length === 1) {
                resultText += `${arr[6][0]}의 날씨를 검색할게요.\n\n`;
            } else {
                resultText += `날씨를 검색할게요.\n\n`;
            }
        }
        resultText += `현재 날씨 검색기능이 없어요\n\nhttps://weather.naver.com/\n\n`;
        await context.sendActivity(resultText.length===0?`처리할 수 없는 메시지입니다. 다시 시도해주세요.`:resultText);
        return
    }

    await context.sendActivity(resultText.length===0?`처리할 수 없는 메시지입니다. 다시 시도해주세요.`:resultText);
}