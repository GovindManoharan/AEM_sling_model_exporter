/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 ~ Copyright 2017 Adobe
 ~
 ~ Licensed under the Apache License, Version 2.0 (the "License");
 ~ you may not use this file except in compliance with the License.
 ~ You may obtain a copy of the License at
 ~
 ~     http://www.apache.org/licenses/LICENSE-2.0
 ~
 ~ Unless required by applicable law or agreed to in writing, software
 ~ distributed under the License is distributed on an "AS IS" BASIS,
 ~ WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 ~ See the License for the specific language governing permissions and
 ~ limitations under the License.
 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
package com.adobe.cq.wcm.core.components.internal;

import org.apache.commons.lang3.StringUtils;
import org.apache.sling.api.SlingHttpServletRequest;

import com.day.cq.wcm.api.Page;
import com.day.cq.wcm.api.PageManager;
import com.drew.lang.annotations.NotNull;

public class Utils {

    private Utils() {
    }

    /**
     * If the provided {@code path} identifies a {@link Page}, this method will generate the correct URL for the page. Otherwise the
     * original {@code String} is returned.
     *
     * @param request     the current request, used to determine the server's context path
     * @param pageManager the page manager
     * @param path        the page path
     * @return the URL of the page identified by the provided {@code path}, or the original {@code path} if this doesn't identify a
     * {@link Page}
     */
    @NotNull
    public static String getURL(@NotNull SlingHttpServletRequest request, @NotNull PageManager pageManager, @NotNull String path) {
        Page page = pageManager.getPage(path);
        if (page != null) {
            return getURL(request, page);
        }
        return path;
    }

    /**
     * Given a {@link Page}, this method returns the correct URL, taking into account that the provided {@code page} might provide a
     * vanity URL.
     *
     * @param request the current request, used to determine the server's context path
     * @param page    the page
     * @return the URL of the page identified by the provided {@code path}, or the original {@code path} if this doesn't identify a
     * {@link Page}
     */
    @NotNull
    public static String getURL(@NotNull SlingHttpServletRequest request, @NotNull Page page) {
        String vanityURL = page.getVanityUrl();
        return StringUtils.isEmpty(vanityURL) ? (request.getContextPath() + page.getPath() + ".html"): (request.getContextPath() + vanityURL);
    }

    public enum Heading {

        H1("h1"),
        H2("h2"),
        H3("h3"),
        H4("h4"),
        H5("h5"),
        H6("h6");

        private String element;

        Heading(String element) {
            this.element = element;
        }

        public static Heading getHeading(String value) {
            for (Heading heading : values()) {
                if (StringUtils.equalsIgnoreCase(heading.element, value)) {
                    return heading;
                }
            }
            return null;
        }

        public String getElement() {
            return element;
        }
    }


}
