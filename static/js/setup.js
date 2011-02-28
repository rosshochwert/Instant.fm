/* --------------------------- SETUP  --------------------------- */

function setupAutogrowInputType() {
    $.editable.addInputType('autogrow', {
        element: function(settings, original) {
            var textarea = $('<textarea />');
            if (settings.rows) {
                textarea.attr('rows', settings.rows);
            } else {
                textarea.height(settings.height);
            }
            if (settings.cols) {
                textarea.attr('cols', settings.cols);
            } else {
                textarea.width(settings.width);
            }
            $(this).append(textarea);
            return(textarea);
        },
        plugin: function(settings, original) {
            var elemId = $(this).parent().attr('id');
            var width;
            switch(elemId) {
                case 'curPlaylistTitle':
                    width = 380;
                    break;
                case 'curPlaylistDesc':
                    width = 470;
                    break;
                default:
                    width = $(this).width();
                    break;
            }
            $('textarea', this).width(width).autogrow(settings.autogrow);
        }
    });
}

// Set up keyboard shortcuts in a cross-browser manner
// Tested in Firefox, Chrome, Safari.
// Keyboard events are a mess: http://www.quirksmode.org/js/keys.html
function setupKeyboardShortcuts() {
    $('#helpLink').colorbox({inline: true, href: '#helpBox'});
    
    $('input, textarea').live('focus', function(event) {
        keyEvents = false; 
    });
    $('input, textarea').live('blur', function(event) {
        keyEvents = true;
    });
    
    $(document).bind('cbox_open', function() {
        colorboxOpen = true;
    });
    $(document).bind('cbox_closed', function() {
        colorboxOpen = false;
    });
    
    $(window).keydown(function(event) {
        var k = event.which;
        log(k);
        var pressed1 = true;
        var pressed2 = true;

        // Disablable events
        if (keyEvents && !event.altKey && !event.ctrlKey && !event.metaKey) {
            switch(k) {                
                // Playback control
                case 39: case 40: // down, right
                    player.playNextSong();
                    break;
                case 37: case 38: // up, left
                    player.playPrevSong();
                    break;
                case 32: // space
                    player.playPause();
                    break;
                case 187: case 61: // +, + on Fx
                    player.increaseVolume();
                    break;
                case 189: case 109: // -, - on Fx
                    player.decreaseVolume();
                    break;
                case 86: // v
                    player.toggleVideo();
                    break;
                case 83: // s
                    player.toggleShuffle();
                    break;
                case 82: // r
                    player.toggleRepeat();
                    break;

                // Playlist editing
                case 74: // j
                    player.moveCurSongDown();
                    break;
                case 75: // k
                    player.moveCurSongUp();
                    break;

                // Navigation
                case 78: // n
                    $('#navNewPlaylist').click();
                    break;
                case 70: // f
                    browser.pushSearchPartial();
                    break;
                case 76: // l
                    player.highlightSong('.playing');
                    break;
                case 66: // b
                    var container = $('#container');
                    var message = $('#backgroundMsg');
                    
                    log(Math.round(container.css('opacity')));
                    if (Math.round(container.css('opacity')) == 0) {
                        showElement(container);
                        hideElement(message);
                    } else if (container.css('opacity') == 1) {
                        hideElement(container);
                        showElement(message);
                    }
                    
                    break;
                case 191: // ?
                    $('#helpLink').trigger('click');
                    break;
                    
                default:
                    pressed1 = false;
                    break;
            }

        } else {
            pressed1 = false;
        }

        // Non-disablable events
        // These keyboard events will always get captured (even when textboxes are focused)
        switch (k) {
            case 27: // escape
                if (!browser.isOpen || colorboxOpen) {
                    return;
                }    
                if (browser.viewStack.length > 1) {
                    browser.pop();
                } else {
                    browser.toggle(false);
                }
                break;
            default:
                pressed2 = false;
                break;
        }

        // If we executed a keyboard shortcut, prevent the browser default event from happening
        if (pressed1 || pressed2) {
            event.preventDefault();
        }
    });
}

function setupFBML(playlist) {
    window.fbAsyncInit = function() {
        FB.init({
          appId: appSettings.fbAppId, // 'Instant.fm' API Key
          // appId: '186788488008637',   // 'Wikileaks: The Musical' API Key
          status: true,
          cookie: true,
          xfbml: true
        });
         
        playlist && nowplaying.tryLoadComments(playlist.url, playlist.title);
    };
    
    (function() {
      var e = document.createElement('script');
      e.type = 'text/javascript';
      e.src = document.location.protocol +
        '//connect.facebook.net/en_US/all.js#appId='+appSettings.fbAppId+'&amp;xfbml=1';
      e.async = true;
      document.getElementById('fb-root').appendChild(e);
    }());
}

function setupSignup() {
    $('#navSignup').colorbox({
        inline: true,
        href: '#signupBox',
        onOpen: function() {
            // If step 2 form is hidden, that means there was a bad error during last sign up attempt, so do reset.
            if (!$('#fbSignupForm').is(':visible')) {
                $('#fbSignupForm').show();
                $('#signupStep1').show();
                $('#signupStep2').hide();
                $('#signupBox > header > .subtitle').text('(1 of 2)');
            }

            $('#fbFacepile')
                .empty()
                .append('<fb:facepile width="390" max_rows="1"></fb:facepile>');
            FB.XFBML.parse($('#fbFacepile').get(0));
        },
        scrolling: false,
        width: 450
    });
    
    $('#fbConnectButton').click(function(event) {

        // remove old form errors and message
        $('#registrationErrors').empty();
        $('#registrationMsg').empty();

        FB.login(function(login_response) {
            if (!login_response.session) {
                log('FB login failed.'); // user cancelled login
            }
          
            FB.api('/me', function(response) {
                var form = $('#fbSignupForm');
                
                // Check that they're not already registered
                $.ajax({
                    url: '/signup/fb-check',
                    dataType: 'json',
                    data: {'fb_id': response.id},
                    success: function(is_registered) {
                        if (is_registered) {
                            form.hide();
                            $('#registrationMsg').text('This Facebook user is already registered on Instant.fm. Try logging in instead.');
                        }
                    }
                });
                $('input[name=name]', form).val(response.name);
                $('input[name=email]', form).val(response.email);
                $('input[name=fb_user_id]', form).val(response.id);
                $('input[name=auth_token]', form).val(login_response.session.access_token);
                $('#fbProfileImage').css('background-image', 'url("http://graph.facebook.com/' + response.id + '/picture?type=square")');
                
                $('#signupStep1').fadeOut(function() {
                    $('#signupBox > header > .subtitle').text('(2 of 2)');
                    
                    $('#signupStep2').fadeIn(function() {
                        $.colorbox.resize();
                        $('input[name=password]', form).focus();
                    });
                });
            });  
        }, {perms:'email'});
    });
     
    // adds an effect called "wall" to the validator
    // TODO: Feross, I just copied and pasted this from JQuery Tools's page.
    //       I'm not sure what effect we want here, but this is how the error
    //       effects are implemented.
    $.tools.validator.addEffect("wall", function(errors, event) {
        // get the message wall
        var wall = $(this.getConf().container).fadeIn();
        
        // remove all existing messages
        wall.find("p").remove();
        
        // add new ones
        $.each(errors, function(index, error) {
            wall.append(
                "<p><strong>" +error.input.attr("name")+ "</strong> " +error.messages[0]+ "</p>"
            );    
        });
  
    // the effect does nothing when all inputs are valid  
    }, function(inputs)  {
    });
    
    // initialize validator and add a custom form submission logic
    $("#fbSignupForm").validator({
        effect: 'wall', 
        container: '#registrationErrors',
   
        // do not validate inputs when they are edited
        errorInputEvent: null
    }).submit(function(e) {
        var form = $(this);
        
        $('#submitFbSignupForm').attr('disabled', 'disabled'); // so the user can only submit the form once
      
        // client-side validation OK.
        if (!e.isDefaultPrevented()) {
      
            // submit with AJAX
            $.ajax({
                url: '/signup/fb',
                data: form.serialize(), 
                type: 'POST',
                dataType: 'json',
                success: function(json) {
                    // everything is ok. (server returned true)
                    if (json === true)  {
                      log("Registration posted successfully.")
                      loginStatusChanged();
                      $.colorbox.close();
                      $('#signupStep2').fadeOut(function() {
                          $('#signupStep1').fadeIn();
                      });
              
                    // server-side validation failed. use invalidate() to show errors
                    } else {
                        if (json && json.success === false && json.errors) {
                            form.data("validator").invalidate(json.errors);
                            log('Registration failt.');
                            $.colorbox.resize();
                        }
                        $('#submitFbSignupForm').removeAttr('disabled');
                    }
                },
                error: function() {
                    log('Error posting form ;_;');
                    $('#submitFbSignupForm').removeAttr('disabled');
                },
            });
            
            // prevent default form submission logic
            e.preventDefault();
        } else {
            $.colorbox.resize();
            $('#submitFbSignupForm').removeAttr('disabled');
        }
    });
}

function setupLogin() {
    $('a[href="#login"]').colorbox({
        inline: true,
        href: "#loginBox",
        onComplete: function() {
            $('input[name=email]', '#login').focus();
        },
        scrolling: false
    });
    $("form#login").validator({
        effect: 'wall', 
        container: '#loginErrors',
   
        // do not validate inputs when they are edited
        errorInputEvent: null
    }).submit(function(e) {
    
        var form = $(this);
        $('#submitLogin').attr('disabled', 'disabled'); // so the user can only submit the form once
        
        // client-side validation OK.
        if (!e.isDefaultPrevented()) {
      
            // submit with AJAX
            $.ajax({
                url: '/login',
                data: form.serialize(), 
                type: 'POST',
                dataType: 'json',
                success: function(json) {
                    // everything is ok. (server returned true)
                    if (json && json === true)  {
                        log('Login succeeded.');
                        loginStatusChanged();
                    // server-side validation failed. use invalidate() to show errors
                    } else {
                        if (json && json.success === false && json.errors) {
                            form.data("validator").invalidate(json.errors);
                            log('Login failt.');
                        }
                        $('#submitLogin').removeAttr('disabled');
                        $.colorbox.resize();
                        $('input[name=password]', '#login').focus();
                    }
                },
                error: function() {
                    log('Error posting form ;_;');
                    $('#submitLogin').removeAttr('disabled');
                },
            });
            
            // prevent default form submission logic
            e.preventDefault();
        } else {
            $.colorbox.resize();
            $('input[name=email]', '#login').focus();
            $('#submitLogin').removeAttr('disabled');
        }
    });
}

function setupLogout() {
	$('a[href="#logout"]').click(function(event) {
      event.preventDefault();
    	$.post('/logout', function() {
        	loginStatusChanged();
            log('Logged out.');
        });
    });
}

function setupNewPlaylist() {
    $('a[href="#new"]').colorbox({
        inline: true,
        href: "#newPlaylistBox",
        onComplete: function() {
            $('input[name=title]', '#newPlaylistForm').focus();
        },
        scrolling: false
    });
    
    // initialize validator and add a custom form submission logic
    $("form#newPlaylistForm").validator({
        effect: 'wall', 
        container: '#newPlaylistErrors',
   
        // do not validate inputs when they are edited
        errorInputEvent: null
    }).submit(function(e) {
        var form = $(this);
        
        $('#submitNewPlaylist').attr('disabled', 'disabled'); // so the user can only submit the form once
      
        // client-side validation OK.
        if (!e.isDefaultPrevented()) {
      
            // submit with AJAX
            $.ajax({
                url: '/new-list',
                data: form.serialize(), 
                type: 'POST',
                dataType: 'json',
                success: function(json) {
                    if (json && json.status && json.status == "ok")  {
                        $.colorbox.close();
                        player.loadPlaylist(json);
                        browser.pushSearchPartial(true);
                        
                    } else {
                        // server-side validation failed. use invalidate() to show errors
                        if (json && json.errors) {
                            form.data("validator").invalidate(json.errors);
                            $.colorbox.resize();
                        }
                    }
                    $('#submitNewPlaylist').removeAttr('disabled');
                },
                error: function() {
                    log('Error posting new playlist form ;_;');
                    $('#submitNewPlaylist').removeAttr('disabled');
                },
            });
            
            // prevent default form submission logic
            e.preventDefault();
        } else {
            $('#submitNewPlaylist').removeAttr('disabled');
            $.colorbox.resize();
        }
        
    });
}

function setupDragDropUploader(dropId, callback) {
    if (Modernizr.draganddrop) {
        new uploader(dropId, null, '/upload', null, callback);
    }
}