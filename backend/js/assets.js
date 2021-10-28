/* Copyright (c) 2021-present Tomra Systems ASA */
geDefaultFeatureText = () => {
    return `@<Tag>
    Feature: <Feature desc>
    
        As a user, I want to 
    
        Scenario: <Scenario description>
    `;
};


module.exports = {
    geDefaultFeatureText: geDefaultFeatureText
}