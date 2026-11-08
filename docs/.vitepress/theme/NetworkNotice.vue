<script setup lang="ts">
// Says which Sui networks the tools are live on. The only place the site states it: every other page says "testnet" for what it
// describes and points here, so no page can claim a network the deployment records do not have.
import network from '../network.json'
import { networkSentence } from './network'

const sentence = networkSentence(network)
</script>

<template>
  <p class="network-notice">
    <strong>{{ sentence }}</strong>
  </p>
</template>
