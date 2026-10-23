// creator/context.js — what every creator step reads: the hero, its update(), and
// navigation to another step by id.
import React from 'react';

const CreatorContext = React.createContext(null);
const useCreator = () => React.useContext(CreatorContext);

export { CreatorContext, useCreator };
