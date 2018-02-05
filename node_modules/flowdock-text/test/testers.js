var testers = {
  getTester: function(suite, section){
    switch (suite) {
      case "autolink":
        switch (section) {
        case "emails":
          return function(test) {
            return FlowdockText.autoLinkEmails(test.text, { emailClass: 'email-link' });
          }
        case "urls":
          return function(test) {
          return FlowdockText.autoLinkUrlsCustom(test.text);
        };
        case "hashtags":
          return function(test) {
          return FlowdockText.autoLinkHashtags(test.text);
        };
        case "usernames":
          return function(test) {
          return FlowdockText.autoLinkMentions(test.text);
        };
        case "all":
          return function(test) {
          return FlowdockText.autoLink(test.text);
        };
      }
      case "extract":
        switch (section) {
        case "highlight":
          return function(test) {
            return FlowdockText.regexen.highlightRegex(test.nick).test(test.text)
          };
        case "emails":
          return function(test) {
            return FlowdockText.extractEmails(test.text);
          };
        case "emails_with_indices":
          return function(test) {
            return FlowdockText.extractEmailsWithIndices(test.text);
          };
        case "mentions":
          return function(test) {
          return FlowdockText.extractMentions(test.text);
        };
        case "mentions_with_predefined_usertags":
          return function(test) {
          return FlowdockText.extractMentions(test.text, ["@username", "@everyone", "@everybody", "@all", "@anyone", "@anybody"]);
        };
        case "mentions_with_indices":
          return function(test) {
          return FlowdockText.extractMentionsWithIndices(test.text);
        };
        case "mentions_with_indices_with_predefined_usertags":
          return function(test) {
          return FlowdockText.extractMentionsWithIndices(test.text, ["@username", "@everyone", "@everybody", "@all", "@anyone", "@anybody"]);
        };
        case "urls":
          return function(test) {
          return FlowdockText.extractUrls(test.text);
        };
        case "urls_with_indices":
          return function(test) {
          return FlowdockText.extractUrlsWithIndices(test.text);
        };
        case "hashtags":
          return function(test) {
          return FlowdockText.extractHashtags(test.text);
        };
        case "hashtags_with_indices":
          return function(test) {
          return FlowdockText.extractHashtagsWithIndices(test.text);
        };
      }
      case "validate":
        switch (section) {
        case "urls":
          return function(test) {
          return FlowdockText.isValidUrl(test.text);
        };
        case "urls_without_protocol":
          return function(test) {
          return FlowdockText.isValidUrl(test.text, true, false);
        };
      }
    }
  }
};
if (typeof module != 'undefined' && module.exports) {
  module.exports = testers;
}
