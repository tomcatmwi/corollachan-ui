import { defineStore } from 'pinia';
import settings from '@assets/settings.json';

export const useIdoruStore = defineStore('idoru', {

    state: () => ({
        language: settings.speech.language,
        subtitles: settings.subtitles.on,
        cameraPosition: settings.cameraPositions.full,
        queue: []
    }),

    getters: {


    },

    actions: {

        changeLanguage(language: string) {
            this.language = language;
        },

        changeCameraPosition(position: string) {
            console.log('New position: ', position)
            this.cameraPosition = position;
        }
    }

})
