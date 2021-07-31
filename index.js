// ==UserScript==
// globals
// @name         Linker
// @namespace    https://jira.gpei.ca
// @version      1.0
// @description  Checks if user has anyone with the same email address
// @author       Burke Taylor
// @match        http*://jira.gpei.ca/*
// @grant        none
// @require      https://cdnjs.cloudflare.com/ajax/libs/arrive/2.4.1/arrive.min.js
// ==/UserScript==
/* globals jQuery, $ */

let currentIssue = "";
let email = "";

async function makeRequest(url) {
    let response = await fetch(url);
    if(response.ok){
        return await response.json();
    }
    else{
        console.log("Error in request");
        return;
    }
}

async function getTicketsByEmail() {
    const url = 'https://jira.gpei.ca/rest/api/2/search?jql=cf[10715]~"' + email + '"&fields=key';
    let tickets = [];
    const json = await makeRequest(url);
    const issues = json.issues;
    for (const issue of issues) {
        tickets.push(issue.key);
    }
    return tickets;
}

function checkForLink(ticket){
    let linkElements = $("dl[class='links-list ']").find("a").not("a[title='Delete this link']")
    let links = [];
    for(let i= 0; i < linkElements.length; i++){
        links.push(linkElements[i].innerHTML);
    }
    return links.indexOf(ticket) > -1;
}

async function sendNotification() {
    let emailElement = document.querySelector("a[title='Follow link']");
    let peip = document.getElementById("key-val");
    if (emailElement == null || peip == null) {
        await sleep(300);
        sendNotification();
        return;
    } else if(currentIssue == peip) {
        return;
    }
    else {
        peip = peip.innerHTML;
        email = emailElement.innerHTML;
    }
    currentIssue = peip;
    document.getElementById('opsbar-transitions_more').onclick = async function () {
        const tickets = await getTicketsByEmail();
        if (tickets.length <= 1) {
            return;
        }
        let alerttext = "";
        for (let i = 0; i < tickets.length; i++) {
            if (tickets[i] != currentIssue && checkForLink(tickets[i]) == false) {
                alerttext += tickets[i] + " ";
            }
        }
        if(alerttext != ""){
            alerttext = alerttext.slice(0, -1);
            if(confirm(alerttext)){
                const cb = navigator.clipboard;
                cb.writeText(alerttext);
            }
        }
    }
}

function sleep(ms){
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkPageChanges() {
    const peip = document.getElementById("key-val");
    if (peip != null) {
        if (peip.innerHTML != currentIssue) {
            sendNotification();
            return true;
        }
    }
    else{
        await sleep(300);
        checkPageChanges();
    }
}

(async () => {
    'use strict';
    $(document).arrive("#key-val", {fireOnAttributesModification: true, existing: true}, function() {
        checkPageChanges();
    });
})();