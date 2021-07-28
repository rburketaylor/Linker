// ==UserScript==
// globals
// @name         link-check
// @namespace    https://jira.gpei.ca
// @version      0.1
// @description  Checks if user has anyone with the same email address
// @author       Burke Taylor
// @match        https://jira.gpei.ca/*
// @grant        GM.xmlHttpRequest
// @require      https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/arrive/2.4.1/arrive.min.js
// ==/UserScript==
/* globals jQuery, $ */

let currentIssue = "";
let email = "";

function makeRequest(url, jsessionid) {
    return new Promise((resolve, reject) => {
        GM.xmlHttpRequest({
            method: "GET",
            url: url,
            headers: {
                "Accept": "application/json",
                "Cookie": jsessionid
            },
            onload: function (res) {
                resolve(res.response);
            },
            onerror: function () {
                reject("Request failed");
            }
        });
    });
}

function getJSessionID(){
    return document.cookie
            .split('; ')
            .find(row => row.startsWith('JSESSIONID'));
}

async function getTicketsByEmail() {
    const url = 'https://jira.gpei.ca/rest/api/2/search?jql=cf[10715]~"' + email + '"&fields=key';
    //Get the session cookie so the script can call the jira api.
    const jsessionid = getJSessionID();
    let tickets = [];
    const response = await makeRequest(url, jsessionid);
    const json = JSON.parse(response);
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
            alert(alerttext.slice(0, -1));
        }
    }
}

function sleep(ms){
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkPageChange() {
    const peip = document.getElementById("key-val");
    if (peip != null) {
        if (peip.innerHTML != currentIssue) {
            sendNotification();
            return true;
        }
    }
    else{
        await sleep(300);
        checkPageChange();
    }
}

(async () => {
    $(document).arrive("#key-val", {fireOnAttributesModification: true, existing: true}, function() {
        checkPageChange();
    });
})();