// ==UserScript==
// @name         link-check
// @namespace    https://jira.gpei.ca
// @version      0.1
// @description  Checks if user has anyone with the same email address
// @author       Burke Taylor
// @match        https://jira.gpei.ca/*
// @grant        GM.xmlHttpRequest
// @require      https://cdnjs.cloudflare.com/ajax/libs/arrive/2.4.1/arrive.min.js
// ==/UserScript==

let currentIssue = "";

function makeRequest(url, jsessionid, tickets){
    return new Promise((resolve, reject) => {
        GM.xmlHttpRequest({
            method: "GET",
            url: url,
            headers: {
                "Accept": "application/json",
                "Cookie": jsessionid
            },
            onload: function(res){
                resolve(res.response);
            },
            onerror: function(){
                reject("Request failed");
            }
        });
    });
}

async function checkemail(email){
    const url = 'https://jira.gpei.ca/rest/api/2/search?jql=cf[10715]~"' + email + '"&fields=key';

    const jsessionid = document.cookie
        .split('; ')
        .find(row => row.startsWith('JSESSIONID'));

    let tickets = [];

    const json = await makeRequest(url, jsessionid, tickets);
    const issues = JSON.parse(json).issues;

    for(const issue of issues){
        tickets.push(issue.key);
    }

    return tickets;
}

async function sendNotification(){
    let email = document.querySelector("a[title='Follow link']");
    let peip = document.getElementById("key-val");
    if(email == null || peip == null){
        return;
    }
    else{
        peip = peip.innerHTML;
        email = email.innerHTML;
    }
    if(currentIssue == peip){
        return;
    }

    currentIssue = peip;

    document.getElementById('opsbar-transitions_more').onclick = async function(){
        const tickets = await checkemail(email);
        if(tickets.length <= 1){
            return;
        }
        let alerttext = "";
        for(let i = 0; i < tickets.length; i++){
            if(tickets[i] != peip){
                alerttext += tickets[i] + " ";
            }
        }
        alert(alerttext.slice(0, -1));
    }
}


(async() => {
    let interval = window.setInterval(function(){
        sendNotification();
    }, 400)
})();
